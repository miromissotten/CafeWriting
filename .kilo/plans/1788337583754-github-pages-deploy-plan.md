# Plan: Deploy Café Writing to GitHub Pages

## Context

The current app (`app.js` + EJS views + SQLite) is a **full-stack server-side application**. GitHub Pages only serves static files — it cannot run Node.js, Express, or SQLite. This plan describes how to get the public-facing portion online via GitHub Pages while keeping the backend on a proper Node host.

## Key Constraint

**GitHub Pages cannot host this app as-is.** The app uses:
- `better-sqlite3` (native Node module — no browser support)
- Express server-side routing
- Server-side database writes (submissions, approvals)

## Recommendations (choose one)

### Option A (Recommended): Static frontend on GitHub Pages + API backend on a Node host

Create a separate static site (plain HTML/CSS/JS) in a `pages/` directory that calls the existing API endpoints (`/api/submissions`, `/api/barista/next-text`). Deploy the static frontend to GitHub Pages and deploy the Express backend to a Node host (Vercel Serverless Functions, Render, Railway, or Fly.io).

**Pros:** Keeps all app functionality. GitHub Pages serves the UI; backend handles data.
**Cons:** Requires a second hosting account for the backend.

### Option B: Read-only static export on GitHub Pages only

Pre-render approved texts into static HTML at build time using a Node script that reads the SQLite DB and generates standalone HTML files. Deploy only the static output to GitHub Pages.

**Pros:** Single-host solution, zero backend cost.
**Cons:** No submissions, no curator/barista features. Content updates require rebuilds.

### Option C: Skip GitHub Pages — host the full app on Render

Deploy the entire Express app to Render or Railway (both support Node + SQLite). Skip GitHub Pages entirely.

**Pros:** One-deploy solution, all features work.
**Cons:** Not GitHub Pages.

---

## Detailed Steps — Option A (Recommended)

### Step 1: Add a CORS-enabled API layer

**File:** `app.js` (modify existing)

Enable CORS on API routes so the GitHub Pages frontend can call the backend:

```js
// Add near the top, after require statements
const cors = require('cors');
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
```

Install the dependency:
```bash
npm install cors
```

> The existing API routes (`/api/submissions`, `/api/barista/next-text`, `/api/qr`) already return JSON — no additional API work needed beyond CORS.

### Step 2: Create a static frontend

**New directory:** `pages/`

**Files to create:**
- `pages/index.html` — Landing page with link to reading room
- `pages/reading-room.html` — Customer reading room (replaces the EJS `customer.ejs` swipe-card logic with pure JS fetching from the API)
- `pages/submit.html` — Submission form (POST to API backend)
- `pages/styles.css` — Copy of `public/styles.css` (or a simplified version)

The `reading-room.html` page should:
1. Fetch `https://<backend-api>/api/submissions` on load
2. Render the swipeable card stack using vanilla JS (adapt the inline script from `customer.ejs`)
3. Handle like/dislike navigation client-side

### Step 3: Add GitHub Pages workflow

**New file:** `.github/workflows/pages.yml`

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
    paths:
      - 'pages/**'
      - '.github/workflows/pages.yml'
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './pages'
      - name: Deploy
        id: github_pages
        uses: actions/deploy-pages@v4
```

### Step 4: Deploy the backend

Pick one Node host (e.g., Render):
- Create a `render.yaml` or use Render dashboard
- Set `buildCommand: "npm install"`
- Set `startCommand: "node app.js"`
- Set env var `CORS_ORIGIN` to your GitHub Pages URL (e.g., `https://yourusername.github.io`)
- Ensure `PORT` is set by the platform (app reads `process.env.PORT`)

### Step 5: Wire frontend to backend

Update `pages/reading-room.html` and `pages/submit.html` to point fetch/POST calls at the deployed backend URL.

### Step 6: Push and verify

1. Commit all new files
2. Push to `main` branch
3. Verify GitHub Actions deploys the Pages site
4. Verify the backend is serving API responses
5. Test the live site

---

## Detailed Steps — Option B (Read-only export)

### Step 1: Create a static export script

**New file:** `scripts/export-static.js`

This script:
1. Opens the SQLite DB with `better-sqlite3`
2. Queries all approved texts
3. Generates a single `dist/index.html` with the approved texts embedded as JSON (replacing the EJS template)
4. Copies `public/styles.css` into `dist/`

### Step 2: Add export to package.json scripts

```json
"scripts": {
  "start": "node app.js",
  "test": "node --test",
  "export": "node scripts/export-static.js"
}
```

### Step 3: Point GitHub Pages at the `dist/` directory

In repo Settings → Pages, set source to `gh-pages` branch (created by workflow) or use the workflow approach from Step 3 above, pointing at `./dist`.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| GitHub Pages blocks client-side form POSTs to external API | Backend must have CORS enabled; use `fetch()` from the static page |
| SQLite DB not on the server when deployed | Backend host (Render/Railway) keeps `data/` directory; GitHub Pages never touches the DB |
| `better-sqlite3` native module fails to compile on some hosts | Render and Railway handle native modules; alternative: switch to `sqlite3` or use a hosted DB like Turso |
| API URL hardcoded in static frontend | Use environment-based URL or a config endpoint |

## Open Questions

1. Which option do you want to pursue — **A** (static frontend + API backend) or **B** (read-only export)?
2. Which Node hosting provider do you prefer for the backend (if Option A)? Render, Railway, Fly.io, or Vercel Serverless?
3. Do you need the submit/curator/barista features online, or just the public reading room?
