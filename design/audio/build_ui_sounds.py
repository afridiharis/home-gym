#!/usr/bin/env python3
"""FORGE UI sounds, built in SoundCraft (headless) from one mallet + bell palette in C major.

    python3 -B design/audio/build_ui_sounds.py              # build every cue
    python3 -B design/audio/build_ui_sounds.py go pr        # just these
    python3 -B design/audio/build_ui_sounds.py --survey     # raw levels only, nothing written

Each cue is its own session, design/audio/sessions/<cue>.scraft (open it in SoundCraft to play or
tweak). The "instruments" are additive: every partial of a mallet or bell is one Subtractive Synth
track playing a sine with its own decay (upper partials die faster, like a struck bar), all into a
short plate reverb and a master chain of EQ (high-pass 380 Hz, low-pass 10 kHz, soft top shelf),
Gain and Maximizer. Each cue is built 0.5 s into its session (SoundCraft params glide in over the
first ~100 ms of a bounce) and that pre-roll is cut off, so the note starts on sample 0.

Levels: every cue is matched on its loudest 200 ms of K-weighted loudness (the ear integrates
short sounds over about that long), measured on the mono fold-down the app plays; rest-end sits
2 dB above the rest. True peak <= -2 dBTP on the WAVs so the AAC files stay under -1.

Outputs: design/audio/<cue>.wav (48 kHz 24-bit) and assets/audio/<cue>.m4a (AAC-LC, mono,
44.1 kHz, 96 kbps, encoded by macOS afconvert after a SoX resample).
"""
import json, os, subprocess, sys, tempfile

sys.dont_write_bytecode = True
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
SESSIONS = os.path.join(HERE, "sessions")
WEB = os.path.join(REPO, "assets", "audio")
sys.path.insert(0, os.path.expanduser("~/.claude/skills/soundcraft-audio/scripts"))
from sc import SC, sec, midi, loudness, _read  # noqa: E402

SR = 48000
PRE = 0.5            # pre-roll cut off after the bounce
TARGET = -14.5       # loudest-200 ms K-weighted loudness, mono (LUFS); see measure()
TP_MAX = -2.0        # dBTP on the WAV masters (AAC adds a little)
MAX_LIMIT = 1.0      # dB of peak limiting allowed on a cue
MAX_PARTIAL_HZ = 8000

# Partials: (name, semitones, cents, level dB, decay as a fraction of the instrument's decay, attack ms)
TIMBRES = {
    # marimba-like: fundamental, a soft octave for body on small speakers, the bar's ~3.94x "tock"
    "mallet": [("fund", 0, 0, 0.0, 1.00, 1.5),
               ("oct", 12, 0, -16.0, 0.40, 1.0),
               ("tock", 24, -28, -8.0, 0.16, 0.6)],
    # vibraphone/celesta-like: longer ring, a struck 4x "ting" and a faint inharmonic glass partial
    "bell": [("fund", 0, 0, 0.0, 1.00, 2.0),
             ("oct", 12, 0, -14.0, 0.45, 1.5),
             ("ting", 24, -10, -11.0, 0.12, 0.8),
             ("glass", 29, 20, -24.0, 0.06, 0.6)],
}

# Cues. inst: name -> (timbre, decay ms (T60 of the fundamental), level dB, reverb send dB or None)
# notes: (inst, pitch, start s, velocity, length s or None = to the end)
CUES = {
    "tick": dict(length=0.080, fade=0.025,
                 inst={"mallet": ("mallet", 260, 0, None)},
                 notes=[("mallet", "G6", 0.0, 104, 0.06)]),
    "go": dict(length=0.250, fade=0.060,
               inst={"mallet": ("mallet", 420, 0, -20), "bell": ("bell", 700, -9, -18)},
               notes=[("mallet", "G5", 0.0, 96, 0.07), ("bell", "G5", 0.0, 70, 0.07),
                      ("mallet", "C6", 0.07, 114, None), ("bell", "C6", 0.07, 96, None)]),
    "warn10": dict(length=0.250, fade=0.080,
                   inst={"bell": ("bell", 550, 0, -14), "mallet": ("mallet", 200, -12, None)},
                   notes=[("bell", "E6", 0.0, 100, None), ("mallet", "E6", 0.0, 80, None)]),
    "rest-end": dict(length=0.600, fade=0.150, louder=2.0,
                     inst={"bell": ("bell", 1100, 0, -12), "mallet": ("mallet", 380, -4, -16)},
                     notes=[("bell", "G5", 0.0, 100, 0.16), ("mallet", "G5", 0.0, 100, 0.16),
                            ("bell", "E6", 0.16, 118, None), ("mallet", "E6", 0.16, 112, None),
                            ("bell", "E7", 0.16, 60, None)]),
    "set-done": dict(length=0.150, fade=0.040,
                     inst={"mallet": ("mallet", 450, 0, -20)},
                     notes=[("mallet", "C6", 0.0, 112, None), ("mallet", "E6", 0.014, 76, None)]),
    "complete": dict(length=1.800, fade=0.450,
                     inst={"mallet": ("mallet", 420, 0, -12), "bell": ("bell", 1500, -2, -9)},
                     notes=[("mallet", "G5", 0.00, 95, 0.09), ("bell", "G5", 0.00, 66, 0.09),
                            ("mallet", "C6", 0.09, 100, 0.09), ("bell", "C6", 0.09, 70, 0.09),
                            ("mallet", "E6", 0.18, 105, 0.11), ("bell", "E6", 0.18, 74, 0.11),
                            ("bell", "C6", 0.29, 100, None), ("bell", "E6", 0.29, 90, None),
                            ("bell", "G6", 0.29, 90, None), ("bell", "C7", 0.29, 104, None),
                            ("mallet", "C6", 0.29, 96, None), ("mallet", "C7", 0.29, 106, None)]),
    "pr": dict(length=1.250, fade=0.350,
               inst={"mallet": ("mallet", 360, 0, -12), "bell": ("bell", 1200, -2, -9),
                     "glass": ("bell", 380, -5, -8)},
               notes=[("mallet", "C6", 0.00, 100, 0.05), ("bell", "C6", 0.00, 78, 0.05),
                      ("mallet", "E6", 0.05, 104, 0.05), ("bell", "E6", 0.05, 80, 0.05),
                      ("mallet", "G6", 0.10, 108, 0.06), ("bell", "G6", 0.10, 82, 0.06),
                      ("bell", "E6", 0.16, 90, None), ("bell", "G6", 0.16, 90, None),
                      ("bell", "C7", 0.16, 108, None), ("bell", "E7", 0.16, 76, None),
                      ("mallet", "C7", 0.16, 112, None), ("mallet", "C6", 0.16, 92, None),
                      ("glass", "G7", 0.30, 86, 0.05), ("glass", "E7", 0.36, 80, 0.05),
                      ("glass", "G7", 0.42, 72, 0.05), ("glass", "E7", 0.48, 64, 0.05),
                      ("glass", "G7", 0.54, 56, 0.05)]),
    "levelup": dict(length=1.000, fade=0.300,
                    inst={"glass": ("bell", 420, 0, -9), "bell": ("bell", 1100, 0, -8)},
                    notes=[("glass", p, 0.035 * i, 72 + 6 * i, 0.035)
                           for i, p in enumerate(["C6", "D6", "E6", "G6", "A6"])]
                          + [("bell", "C7", 0.175, 112, None), ("bell", "G6", 0.175, 84, None),
                             ("glass", "C7", 0.175, 96, None),
                             ("glass", "E7", 0.29, 70, 0.06), ("glass", "G7", 0.35, 64, None)]),
    "silence": dict(length=0.150, silent=True),
}


# --------------------------------------------------------------------------------------------
# measurement

def _biquad(x, b, a):
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    b0, b1, b2 = b
    _, a1, a2 = a
    for i, v in enumerate(x):
        o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, v, y1, o
        y[i] = o
    return y


def kweight(x):
    """ITU-R BS.1770 K-weighting at 48 kHz."""
    x = _biquad(x, (1.53512485958697, -2.69169618940638, 1.19839281085285), (1, -1.69065929318241, 0.73248077421585))
    return _biquad(x, (1.0, -2.0, 1.0), (1, -1.99004745483398, 0.99007225036621))


def measure(path):
    """Numbers for one WAV: loudest 200 ms K-weighted loudness of the mono fold-down (the matching
    figure), ffmpeg true peak (worst channel) and momentary max, sample peak, where the sound starts,
    how it ends, and where its energy sits."""
    x, sr = _read(path)
    assert sr == SR, sr
    mono = x.astype(np.float64).mean(axis=1)
    n = len(mono)
    w = int(0.2 * sr)
    k = kweight(np.concatenate([np.zeros(w), mono, np.zeros(w)]))
    ms = np.convolve(k * k, np.ones(w) / w, mode="valid")
    l200 = -0.691 + 10 * np.log10(ms.max() + 1e-20)
    peak = float(np.abs(x).max())
    above = np.nonzero(np.abs(mono) > 10 ** (-60 / 20))[0]
    tail = mono[-int(0.005 * sr):]
    spec = np.abs(np.fft.rfft(mono * np.hanning(n), n=max(n, 8192))) ** 2
    f = np.fft.rfftfreq(max(n, 8192), 1 / sr)
    tot = spec.sum() + 1e-30
    ff = loudness(path)
    return {
        "seconds": round(n / sr, 4),
        "l200_mono": round(l200, 2),
        "true_peak": ff["true_peak"],
        "momentary_max": ff["momentary_max"],
        "sample_peak_db": round(20 * np.log10(peak + 1e-12), 2),
        "onset_ms": round(above[0] / sr * 1000, 2) if len(above) else None,
        "end_rms_db": round(10 * np.log10((tail ** 2).mean() + 1e-20), 1),
        "pct_below_400": round(100 * spec[f < 400].sum() / tot, 2),
        "pct_500_4k": round(100 * spec[(f >= 500) & (f <= 4000)].sum() / tot, 1),
        "pct_above_6k": round(100 * spec[f > 6000].sum() / tot, 2),
        "silent": peak == 0.0,
    }


# --------------------------------------------------------------------------------------------
# session building

def hz(p):
    return 440.0 * 2 ** ((p - 69) / 12)


def build(sc, name, cue, gain_db=0.0, ceiling=-2.4):
    sc.new_session(f"FORGE {name}", sample_rate=SR, bpm=120)
    m = sc.master_track()
    sc.insert(m, "eq_7band", {"hpf_on": 1, "hpf_freq": 380, "hpf_slope": 2,
                              "high_shelf_freq": 6000, "high_shelf_gain": -2.5,
                              "lpf_on": 1, "lpf_freq": 10000, "lpf_slope": 1})
    gslot = sc.insert(m, "gain", {"gain": gain_db})
    mslot = sc.insert(m, "maximizer", {"threshold": 0, "ceiling": ceiling, "release": 40})
    end = PRE + cue["length"]
    if cue.get("silent"):
        return m, gslot, mslot, end
    sends = any(v[3] is not None for v in cue["inst"].values())
    if sends:
        sc.bus("Verb", "plate_reverb", {"mix": 100, "decay": 1.1, "pre_delay": 10, "size": 45,
                                        "damping": 6500, "diffusion": 85, "width": 55, "low_cut": 500})
    for iname, (timbre, decay, level, send) in cue["inst"].items():
        for pname, semis, cents, pdb, frac, attack in TIMBRES[timbre]:
            notes = []
            for inst, pitch, start, vel, length in cue["notes"]:
                if inst != iname:
                    continue
                p = midi(pitch) + semis
                if p > 127 or hz(p + cents / 100) > MAX_PARTIAL_HZ:
                    continue
                dur = (cue["length"] - start) if length is None else length
                notes.append((p, PRE + start, dur, vel))
            if not notes:
                continue
            d = max(15.0, decay * frac)
            t = sc.instrument(f"{iname} {pname}", params={
                "osc1_wave": 2, "osc2_wave": 2, "osc_mix": 100, "osc2_semitones": 0, "osc2_detune": cents,
                "cutoff": 20000, "resonance": 0, "filter_env_amount": 0, "glide": 0,
                "amp_attack": attack, "amp_decay": d, "amp_sustain": 0, "amp_release": d,
                "velocity": 70, "level": -6}, volume=level + pdb)
            c = sc.midi_clip(t, sec(0), end=sec(end + 0.5))
            sc.notes(c, notes, unit="seconds")
            if send is not None:
                sc.send(t, "Verb", send + pdb / 2)
    sc.fade_mix(end - cue["fade"], end, to_db=-80.0)
    sc.run("markers.add", name=name, at=sec(PRE))
    return m, gslot, mslot, end


def bounce(sc, path, end):
    return sc.bounce(path, start=0, end=end, dither=False, trim_head=PRE)


def make(name, survey=False):
    cue = CUES[name]
    out = os.path.join(HERE, f"{name}.wav")
    sc = SC()
    try:
        m, gslot, mslot, end = build(sc, name, cue)
        if cue.get("silent"):
            bounce(sc, out, end)
            sc.save(os.path.join(SESSIONS, f"{name}.scraft"), replace=True)
            return measure(out)
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
        bounce(sc, tmp, end)
        raw = measure(tmp)
        if survey:
            os.remove(tmp)
            raw["plr200"] = round(raw["true_peak"] - raw["l200_mono"], 2)
            return raw
        target = TARGET + cue.get("louder", 0.0)
        # a very short pluck is peaky for its loudness: let the limiter shave at most MAX_LIMIT dB
        # off its first transient, and let it sit under the target rather than squash it
        cap = TP_MAX - 0.2 - raw["true_peak"] + MAX_LIMIT
        gain, ceiling = min(target - raw["l200_mono"], cap), -2.4
        for _ in range(6):
            sc.set(m, gslot, gain=round(gain, 2))
            sc.set(m, mslot, ceiling=round(ceiling, 2))
            bounce(sc, out, end)
            r = measure(out)
            miss, over = target - r["l200_mono"], r["true_peak"] - TP_MAX
            if (abs(miss) <= 0.15 or (miss > 0 and gain >= cap)) and over <= 0:
                break
            if over > 0:
                ceiling -= over + 0.1
            gain = min(gain + miss, cap)
        os.remove(tmp)
        r.update({"target": target, "under_target": round(target - r["l200_mono"], 2), "gain_db": round(gain, 2),
                  "ceiling_db": round(ceiling, 2), "raw_true_peak": raw["true_peak"],
                  "limiting_db": round(max(0.0, raw["true_peak"] + gain - r["true_peak"]), 2)})
        os.makedirs(SESSIONS, exist_ok=True)
        sc.save(os.path.join(SESSIONS, f"{name}.scraft"), replace=True)
        return r
    finally:
        sc.close()


# --------------------------------------------------------------------------------------------
# web encode

def encode(name):
    src = os.path.join(HERE, f"{name}.wav")
    dst = os.path.join(WEB, f"{name}.m4a")
    os.makedirs(WEB, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        mono = os.path.join(td, "mono44.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af",
                        "pan=mono|c0=0.5*c0+0.5*c1,aresample=44100:resampler=soxr:precision=28",
                        "-c:a", "pcm_f32le", mono], check=True)
        if os.path.exists(dst):
            os.remove(dst)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "96000", "-s", "0", "-q", "127",
                        mono, dst], check=True)
    probe = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "stream=codec_name,profile,sample_rate,channels,bit_rate:format=duration,bit_rate",
         "-of", "json", dst], capture_output=True, text=True).stdout)
    st, fm = probe["streams"][0], probe["format"]
    with tempfile.TemporaryDirectory() as td:
        dec = os.path.join(td, "dec.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", dst, "-c:a", "pcm_f32le", dec], check=True)
        x, sr = _read(dec)
        ff = loudness(dec)
        above = np.nonzero(np.abs(x[:, 0]) > 10 ** (-60 / 20))[0]
    return {"m4a": os.path.relpath(dst, REPO), "codec": st["codec_name"], "profile": st.get("profile"),
            "rate": int(st["sample_rate"]), "channels": st["channels"],
            "kbps": round(int(st.get("bit_rate") or fm.get("bit_rate") or 0) / 1000),
            "seconds": round(float(fm["duration"]), 3), "decoded_seconds": round(len(x) / sr, 3),
            "true_peak": ff["true_peak"], "momentary_max": ff["momentary_max"],
            "onset_ms": round(above[0] / sr * 1000, 2) if len(above) else None,
            "kB": round(os.path.getsize(dst) / 1024, 1)}


def main(argv):
    survey = "--survey" in argv
    names = [a for a in argv if not a.startswith("--")] or list(CUES)
    report = {}
    for name in names:
        r = make(name, survey=survey)
        if not survey:
            r["web"] = encode(name)
        report[name] = r
        print(name, json.dumps(r), flush=True)
    return report


if __name__ == "__main__":
    main(sys.argv[1:])
