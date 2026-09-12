# Codebase Cleanup Plan

## Context
Clean up `C:\miro\20260901_CafeWriting` based on static analysis findings. Prioritize correctness, security, and maintainability.

## Decisions
- Scope: fix all high/critical issues plus selected medium issues.
- Out of scope: large refactors like removing all inline styles (too many touch points, low risk).

## Verified Findings
- `README.md` has raw git conflict markers at lines 1 and 148.
- `views/customer.ejs` uses `window._voteOverlayLike/Dislike` globals (lines 326–327).
- `views/customer.ejs` injects `text.content` via `innerHTML` without escaping (line 313) — XSS risk.
- `views/customer-submit.ejs` has `action`/`method` on a form that is intercepted by JS fetch (line 21).
- `public/styles.css` contains unused `.text-list` and `.text-card` classes (lines 188–199).
- `test/app.test.js` leaves temporary DB files behind (no cleanup).

## Ordered Tasks

### 1. Resolve Git Conflict in README
- **File:** `README.md`
- **Action:** Remove conflict markers, keep one canonical title (`# Café Writing Sharing`).

### 2. Add `.gitignore`
- **File:** `.gitignore` (new)
- **Action:** Ignore `node_modules/`, `tmp-*.db`, `data/cafe_writing.db*`.

### 3. Clean Up Test Artifacts
- **File:** `test/app.test.js`
- **Action:** Delete temporary DB files after each test (e.g., `fs.rmSync(dbPath, { force: true })`).

### 4. Fix XSS in customer.ejs
- **File:** `views/customer.ejs:313`
- **Action:** Escape `text.content` before assigning to `innerHTML` (use `textContent` or an escaping helper).

### 5. Remove Confusing window Globals
- **File:** `views/customer.ejs`
- **Action:** Replace `window._voteOverlayLike/Dislike` with module-scoped variables inside the script.

### 6. Remove Ignored Form Attributes
- **File:** `views/customer-submit.ejs:21`
- **Action:** Remove unused `action` and `method` from the form tag.

### 7. Fix Rapid-Click Double-Swipe Bug
- **File:** `views/customer.ejs`
- **Action:** Add `isTransitioning` guard to block duplicate votes during the 250ms swipe timeout.

### 8. Remove Dead CSS
- **File:** `public/styles.css:188-199`
- **Action:** Delete unused `.text-list` and `.text-card` classes.

### 9. Normalize Seed Data Nulls
- **File:** `app.js` seed array
- **Action:** Explicitly include all nullable fields in every seed object.

## Validation
- Run `npm test` after each batch.
- Smoke-test `/customer` swipe flow and `/curator` dashboard manually after changes.

## Out of Scope
- Large refactors like removing all inline styles.
- Extracting EJS partials for repeated table rows (touches many files, low risk).
