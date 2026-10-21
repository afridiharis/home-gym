# FORGE — Home Gym

A back-safe strength and rehab app for a Sportsroyals power tower, built around an L5-sensitive spine. It runs as an iPhone Home Screen web app.

**Use it:** https://afridiharis.github.io/home-gym/ → Share → Add to Home Screen. No accounts. Your data stays on your phone (Me → Back up my data).

- **Today** always shows one big next step: the workout, the 10-minute Spine Reset, or a quick 8-minute version when you're short on time.
- **Built around your tower:** every move shows which station (bar, dips, knee raise, front-foot handles, floor) and how to set it up, with a photo of your actual tower.
- **Split days and two-a-days** with research-backed limits (see [PLAN.md](PLAN.md)).
- Traffic-light back check before strength work; leg symptoms always stop the session.
- Weekly ring + forgiving streaks, XP, badges, demos for every move, sound cues, resumable sessions.
- iPhone Calendar reminders via `.ics` files with alerts.

**Develop:** sources in `src/` (`data.js`, `tower.js`, `guard.js`, `core.js`, `demos.js`, `ui/*.js`, `styles/*.css`). `python3 tools/build.py` builds `index.html`, `manifest.webmanifest` and `sw.js`. Design sources (VectorCraft, FigCraft, LightCraft, SoundCraft, EffectCraft, PhotoCraft recipes) live in `design/`; print files in `print/`. Raw photos go in `media/` (git-ignored, since the repo is public).

The training rationale is in [PLAN.md](PLAN.md); the redesign research is in [docs/redesign/research.md](docs/redesign/research.md). Not medical advice.

Built with [Claude Code](https://claude.com/claude-code).
