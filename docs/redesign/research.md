# FORGE redesign — research notes (2026-10-21)

User brief: current UI "not good or friendly". Main complaint: **unclear what to tap**. Direction chosen: **bright & encouraging** (dark mode kept). Multi-session wanted: **split AM + PM halves** and **two full sessions** on some days. User will supply photos/clips in `media/`.

## 1. App teardown (Hevy, Strong, Fitbod, NTC, Sweat, Future, Freeletics, Calistree, Calisteniapp, Duolingo, Streaks, Apple Activity, Gentler Streak, Finch, Strava)

Ranked patterns to adopt:
1. **One obvious next action on Today** (Duolingo path, Fitbod auto-workout). One big card + one big Start in the thumb zone. Show which tower stations the session uses; order to minimise station switching.
2. **Minimum dose that counts** (Apple stand minute, Gentler Streak scale up/down). "Quick 8 min" one tap away; default on yellow/red days.
3. **Forgiving streak**: weekly target as the primary streak (Strava Mon–Sun), daily flame secondary; freezes (Duolingo +0.38% DAU, no extra days off); red back day pauses rather than breaks (Apple ring pause, Gentler Streak "injured"). Copy: "You showed up 42 days", never "you lost".
4. **Full-screen focused player** (NTC, Sweat): demo loop fills the top half, giant rep target, one big Done at the bottom, tab bar hidden.
5. **Pre-filled targets, one tap to log** (Hevy/Strong): Done logs the target; ± only for "got fewer/more".
6. **Rest timer auto-starts, lives in the thumb zone**, ±15s/Skip, shows what's next.
7. **Interruption-proof**: save on every tap, "Resume set 2 of knee raises" card on Today, keep screen awake.
8. **Audio-first cues** for holds ("10 seconds left… 3, 2, 1"). No vibration API on iOS Safari.
9. **Readiness check-in visibly changes the session**; one-tap post-session "Easy / Right / Hard" + "Back OK?" feeding ladders.
10. **Specific celebrations** (Hevy per-set pop + live PRs; Duolingo milestone animation +1.7% D7). Milestones at 7/30/50/100 days. Confetti tied to PRs, not generic.
11. **Ladders as a skill map with the next unlock** ("2 more sessions at 3×12 unlocks hanging knee raises").
12. **One yes/no ring** for the main goal (Apple): weekly sessions ring + core mini-ring; heatmap one level down.
13. **"How far you've come"** framing ("Started 3 pull-ups → now 8"); avoid week-vs-week shame (Strava Weekly Snapshot backlash).
14. **Few, kind reminders**; no guilt copy.
15. **Detail one tap deep; ≤3-question onboarding** (NTC 6 steps, Fitbod 14, Freeletics ~25 — reviewers hate long ones).

Friendly visual language: rounded shapes only (Duolingo shape language), bright saturated colour on lots of white, big numbers, sentence case, one consistent icon/illustration set (no emoji soup), ~1 line of copy per card. Intimidating: dense log tables, body-image photos, trophy/filter overload, all-caps condensed everywhere.

Anti-patterns from reviews: sessions dying on phone lock (Thenx), no pause (Centr), can't skip/repeat (Calisteniapp), rigid same-for-everyone plans (Madbarz), long onboarding + paywall before value (Freeletics/Fitbod), no "+10s" on holds (NTC), guilt notifications (Duolingo), punitive missed-task mechanics (Habitica), un-dismissable comparison banners (Strava).

Sources: blog.duolingo.com (streak, home redesign, shape language), smashingmagazine.com/2026/02/designing-streak-system-ux-psychology, hevyapp.com features, screensdesign.com showcases (Hevy, Fitbod, Freeletics, NTC, Finch), sketch.com/blog/gentler-streak, macstories Streaks 3 review, 9to5mac watchOS 11 ring pause, support.strava.com streaks, road.cc Strava snapshot, madegooddesigns.com/fitness-app-design, app-store review aggregators.

## 2. Multiple sessions per day — evidence → guardrails

Evidence grades: A meta-analysis/large RCT · B small RCT/cohort · C lab/expert · J judgement call.

- **Splitting a day's volume into AM + PM is safe and may slightly help strength** (Häkkinen 1994; Hartman 2007; 2022 RCT: squat 1RM +16.1% vs +7.8%, no upper-body difference) — B. The risk is *adding* volume, not splitting it.
- Exercise snacks (VILPA, Stamatakis 2022 Nat Med): 3 × 1–2 min/day → HR 0.61 all-cause mortality; benefit plateaus ~3–6 bouts. Cardio/metabolic tool, not a strength substitute — B.
- Grease-the-groove: no peer-reviewed trial (C). Equal weekly volume → frequency doesn't change strength (Grgic 2018, A).
- Recovery: MPS back near baseline ~36 h (MacDougall 1995); training to failure delays recovery 24–48 h (Morán-Navarro 2017); ≥48 h before the same muscle hard again (ACSM). Weekly 10–20 hard sets/muscle (Schoenfeld 2017, Pelland 2026). Tendons adapt slower; connective tissue "resets" ~6 h (Baar, C).
- Back: McGill Big 3 daily (multiple times = J); morning disc bending stress ~300% higher (Adams 1987, B); avoiding morning flexion cut pain ~33% (Snook 1998); fatigue raises lumbar bending moment 36% (Dolan & Adams 1998) → keep trunk work early and never in both sessions of a two-a-day.
- Overreaching: self-report (mood, fatigue, soreness, sleep) tracks load better than objective markers (Saw 2016). Sleep loss: MPS −18% (Lamon 2021), performance −7.6% (Craven 2022).

### Guardrail spec adopted
| Category | Max/day | Min spacing | Rules |
|---|---|---|---|
| Strength (full day, or one half of a split day) | 1 default; 2 allowed | ≥ 6 h | 2nd full session must be a different region (upper ↔ lower). Max 5 hard-set days/week; ≥1 full rest day. |
| Spine Reset | 3 | ≥ 2 h | Any back status if non-provoking. Doesn't count toward set caps. |
| Walk | unlimited | — | Prompt 2–3 × 10–15 min. ~150 min/week target. |
| 5-min Rescue | counts as light strength | — | Never blocks. |

Volume caps: same pattern hard again <24 h → block; 24–48 h → warn. Hard sets per pattern per day: warn 8, block 10. Total hard sets per day: warn 20, block 26. Hard sets per pattern per week: target 10–20, warn >20. Trunk-flexor hard sets never in both sessions of a two-a-day.
First hour after waking: strength blocked; walk/cat-camel/hang OK.
Back status: yellow → max 1 strength session, sets −50%, no knee raises; red → strength blocked, walks + gentle Reset only; 3 red days → see a clinician.
UI: nudge at 80% of a cap ("2 pull sets left today"); soft warnings dismissible in one tap; hard blocks always offer an allowed alternative; every message gives a one-line reason.
Auto-deload suggestion: reps drop ≥10% two sessions running, or ≥3 bad-recovery days in 7, or soreness >72 h, or every 5–7 weeks.

Sources: Stamatakis 2022 (PMC9800274), Jenkins 2019 (PMID 30649897), Häkkinen 1994, Hartman 2007, PMID 33634677, Grgic 2018 (PMC6081873), Schoenfeld 2017, MacDougall 1995 (PMID 8563679), Morán-Navarro 2017 (PMID 28965198), Adams 1987 (PMID 3589804), Snook 1998 (PMID 9854759), Dolan & Adams 1998 (PMID 9796671), Meeusen 2013, Saw 2016 (BJSM), Lamon 2021 (PMC7785053), WalkBack Lancet 2024.

## 3. The tower — Sportsroyals Power Tower YTA03 (ASIN B0DJSYBQWS)

| Item | Value | Confidence |
|---|---|---|
| Footprint × height | 1050 × 870 mm base, 2200 mm max height | High |
| Pull-up bar | 1450–2200 mm, **9 settings** (~94 mm steps, estimate) | High |
| Bar length / upright spacing | 1041 mm / 570 mm | High |
| Pull-up grips | Straight foam centre + angled (upturned) ends. **No neutral/parallel grips.** | High |
| Dip / VKR handles | Same J-shaped handles: horizontal end = dip grip (~1150–1200 mm), vertical end = knee-raise grip | High (shape), low (height) |
| Arm pads | Foam, 10° inward tilt, ~1250–1300 mm, fixed | High / low |
| VKR backrest | Fixed height; depth adjusts in 5 positions via knob | High |
| Push-up handles | Two pegs on the curved base braces, near the floor | High / low (height) |
| Real load limit | **150 kg** ("Maximum Weight Recommendation"); marketing 180–204 kg | High |
| Product weight | 19.96 kg | High |

Owner feedback: wobbles if you swing/kip and "flexes a bit" on dips; knees/shins knock the lower crossbar during pull-ups; a 113 kg user bent brackets; grips can loosen after ~12 months of 3–4×/week; assembly tip: leave bolts loose, square the frame, then tighten; manual says check all bolts before each workout, use a flat surface + floor mat, indoor only; no anchor holes. At 220 cm, users ≥ 6'2" need bent knees to dead-hang; ceiling ~2.5 m for top setting.

Design implications: cue "use the angled ends" for elbow-friendly pulls; "knees bent, ankles crossed behind" for crossbar clearance; strict reps (also a tower-stability issue); weekly "bolt check" habit card; station-aware instructions with bar-height setting.

Sources: amazon.co.uk/.com/.ca/.de dp/B0DJSYBQWS, listing dimension/tag photos, pruefengel.de/fed-sportsroyals-power-tower (94/100), Sportsroyals PT1 user manual PDF.

## 4. Community voice (Reddit via Arctic Shift archive, forums)

- Simple beats feature-heavy; people want: open → log → see a graph/PR. Paywalls and rigid plans are resented; mid-session swap/regress/skip wanted (r/bodyweightfitness 1fhdc4d, 6i934o, 5m6d5m).
- Never leave the app between sets: auto rest timer with sound + 3-2-1 countdown, screen on, next move shown (1lf6te0, 5m6d5m).
- ADHD/distractible: shame is the enemy ("just begin again", r/ADHD 1t0tcab, 143↑); lost streaks → quitting (yo8g7h, 282↑) → grace days / count total sessions; tiny sessions count; 5-4-3-2-1 countdown to start (o0p8jz); stacked reminders anchored to a routine; boredom kills → light novelty.
- Back issues: reassurance from lifters who came back (13cjwgg); return-too-fast is the classic re-injury (r/Sciatica 1bg7e1y); McGill Big 3, side planks, Pallof; captain's-chair knee raises > floor leg raises, pelvis tucked, no swing (1qbpu2w); straight-leg hanging raises often provoke pain (6vnu7q); dead hangs not risk-free for everyone (r/backpain 1hqpjpq) → keep optional, feet-supported, core on.
- Power towers: wobble is the #1 concern → weigh down the feet, mat, no kipping, keep rows near-vertical (r/homegym e3wtma, 1oxr5ok); tall users hit the frame; a tower alone builds real muscle (10umgar).

Applied: one big Start, minimum dose counts, forgiving streak + weekly goal, auto rest + 3-2-1 + next-up, swap/easier/skip one tap, per-session back feedback that eases tomorrow, tower stability cues (weigh down feet, no kipping), optional/feet-supported hangs.
