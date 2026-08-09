# Home Gym App — Design Spec (2026-08-08)

## Who this is for

Haris. Adult male, has an L5 lower-back issue (exact diagnosis unknown — treated as "sensitive lumbar disc, train conservatively"). Equipment: Sportsroyals Power Tower (pull-up bar, dip handles, vertical knee raise station, push-up handles) in his room. Goals, in priority order:

1. Rehabilitate the back / never aggravate it
2. Get very strong (calisthenics strength)
3. Visible abs (six-pack) — implies body-fat reduction, not just ab training
4. **Consistency** — self-identified biggest problem is distraction/falling off. The app's #1 job is engagement.

Constraint from user: use at most 10 agents (hard cap 15). Non-interactive session — all ambiguity resolved by making things configurable in-app rather than asking.

## Decision: what we're building

**A single self-contained web app** (one HTML file, inline CSS/JS, zero external dependencies, localStorage persistence), delivered two ways:

1. Published as a **Claude Artifact** → instantly usable on his iPhone at a private URL, no hosting setup.
2. Kept in this repo (`index.html`) as the canonical source he can host anywhere later.

### Approaches considered

- **A. Static single-file app + Artifact (CHOSEN)** — zero backend, works on iPhone today, offline-tolerant, private by default. Risk: localStorage eviction on Safari → mitigated with one-tap JSON export/import backups and encouraging Add to Home Screen.
- **B. Supabase-backed full-stack app** — real sync/auth, but needs project provisioning, costs, OAuth that this session can't complete, and adds friction to daily use. Overkill for a single user. Rejected.
- **C. Native iOS app** — can't be deployed to a physical iPhone from this session (signing), and user asked for a web app. Rejected.

### iPhone reminders/alarms integration (the honest, reliable paths)

Web pages cannot set native Clock alarms or write directly into Apple Reminders. What reliably works and what we ship:

- **.ics calendar export with VALARM alerts**: app generates a calendar file for the training schedule (repeating events, each with an alert). Opening it on iPhone adds real Calendar events → real notifications/alarms. This is the primary integration.
- **In-app rest timer** with audible beep (Web Audio) for use during sessions.
- **Add to Home Screen** guidance → app icon on the phone, full-screen feel, protects localStorage.
- **Shortcuts/Reminders guidance**: a short in-app guide for a Siri one-liner / Shortcuts automation for users who prefer Reminders over Calendar.
- Anything research (agent) contradicts here gets corrected before build.

## The program (shape; details filled by research)

- **Daily spine hygiene (~10 min)**: McGill Big 3 (curl-up, side plank, bird dog) with descending-pyramid dosing + dead hangs for decompression + walking prescription. Never skipped — it's the streak anchor.
- **4-day/week strength split** on the power tower (configurable days): Pull / Push / Lower + Core / Full-body. Each movement pattern has a **progression ladder** (e.g. dead hang → scap pulls → negatives → assisted → full pull-up → weighted/archer) with explicit level-up criteria; the app tracks the user's level per pattern.
- **Phases**: Foundation (wk 1–4, rehab-biased, technique), Build (wk 5–10), Advance (wk 11+). Onboarding assessment (pain level, current max reps) picks starting levels; a pain "traffic light" system governs day-to-day intensity and substitutions.
- **L5 safety rules baked into every exercise entry**: neutral-spine cues, no loaded lumbar flexion early, morning caveat, red-flag list (stop & see doctor).
- **Abs strategy**: anti-extension/anti-rotation core hierarchy + short nutrition primer (deficit, protein target) because visible abs are made in the kitchen.

## App architecture

Single HTML fragment (artifact-compatible: no doctype/html/head/body — publish-time wrapper adds them). Repo also gets a standalone wrapper `index.html` for local/self-hosted use. Both share identical inline source.

**Modules (single file, clearly sectioned JS):**
- `store` — versioned state in localStorage (`homegym.v1`), JSON export/import, migration guard.
- `program` — static data: exercise library (cues + L5 notes), progression ladders, phase templates, workout generator (day type × user levels × pain state → concrete session).
- `views` — hash-free simple router over screens: Onboarding, Today, Workout Player, Progress, Library, Plan, Settings.
- `player` — guided workout: one exercise at a time, big touch targets, rep logger, auto rest timer (Web Audio beep), swap/skip with L5-safe substitutions.
- `gamification` — streaks (with repair/freeze mechanic to prevent abandonment), XP/levels, badges, confetti on completion, "5-minute rescue workout" to protect streaks.
- `charts` — inline SVG charts (volume/week, per-exercise progression, calendar heatmap, bodyweight trend). No chart libs.
- `ics` — RRULE + VALARM calendar generation, data-URI/blob download (whichever research confirms works on iOS Safari).

**Design language**: mobile-first, dark-friendly, huge tap targets, one-tap to start today's session; theme-aware for the artifact viewer.

## Error handling & edge cases

- localStorage unavailable/full → in-memory fallback + visible warning banner + export nag.
- Corrupt state JSON → reset-with-backup flow (dump raw to textarea for rescue), never white-screen.
- Pain flare (user reports red) → session auto-swaps to rehab-only day; app never prescribes through pain.
- No JS APIs assumed: vibration/notifications/wake-lock are progressive enhancements behind capability checks.

## Testing/verification

- Agent review pass (≤5 reviewers): L5 safety audit of the program, code correctness, UX/engagement, ICS validity on iOS.
- Manual verification in the in-app browser (mobile viewport): onboarding → generate session → log sets → complete → streak/XP → charts → ICS download → export/import.

## Out of scope (YAGNI)

Accounts/sync, social features, video hosting (text/emoji form cues instead), Apple Health, progress photos, AI chat. All addable later.
