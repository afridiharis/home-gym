# ⚒️ FORGE — Home Gym

A self-contained, back-safe strength & rehab web app for a power-tower home gym (pull-up bar, dips, knee-raise station, push-up handles), built around an L5-sensitive spine.

**Use it:** open `index.html` — everything is in that one file. No server, no dependencies, no accounts. All data stays in your browser's local storage (export backups from Setup → Backup).

- Daily 10-minute **Spine Reset** (McGill Big 3) as the streak anchor
- 4-day Upper/Lower split with 9 progression ladders and rep-window progression
- Traffic-light pain system; leg symptoms always stop the session
- Streaks with automatic freezes + repair windows, XP, badges, animated exercise demos
- iPhone Calendar reminders via `.ics` export with alerts

**Develop:** sources live in `src/` (`styles.css`, `data.js`, `demos.js`, `core.js`, `ui.js`). `./build.sh` assembles `index.html` (standalone) and `artifact.html` (Claude Artifact fragment).

The full training program rationale is in [PLAN.md](PLAN.md). Not medical advice — see the disclaimers in the app.

🤖 Built with [Claude Code](https://claude.com/claude-code)
