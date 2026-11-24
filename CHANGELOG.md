# Changelog

## STEP 0 — Repo Hygiene & Diagnostic Copy Accuracy
- Added `data/*` (with `!data/alphaquant_store.example.json` exception) to `.gitignore` so runtime stores containing user credentials or PII are never tracked. *(Note: no `.git` metadata directory is present in this workspace container, so `git rm --cached` was not applicable locally.)*
- Added sanitized `data/alphaquant_store.example.json` containing empty store collections with zero user credentials or personal information.
- Updated `src/server/store/db.ts` (`loadFromDisk`) to deterministically initialize a fresh store file on disk when missing.
- Updated `src/server/math/nlpEngine.ts`, `src/server/services/copilotKnowledge.ts`, and `src/pages/LandingPage.tsx` to remove inaccurate claims that news events or KS drift automatically widen split-conformal intervals.
