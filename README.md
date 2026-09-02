<<<<<<< HEAD
# CafeWriting
=======
# Café Writing Sharing

A local, single-computer web app for discovering short literature in cafés and bars. Customers browse poems, stories, and quotes one at a time with a Tinder-style swipe interface. Curators moderate submissions from a simple editor's desk. Barista generates and prints literary cards.

## Tech stack

- Node.js + Express
- SQLite via better-sqlite3
- EJS templates for the server-rendered UI
- Google Fonts (Cormorant Garamond for literary content, Source Sans 3 for UI)
- QR code generation for local customer access

## Architecture

- Frontend: server-rendered HTML with a single CSS design system (`public/styles.css`)
- Shared `views/partials/head.ejs` for consistent fonts, viewport, and stylesheet across all 9 templates
- Backend: Express routes for customer, curator, and barista experiences
- Database: SQLite file in the local project folder
- Local networking: app binds to `0.0.0.0` and can be accessed from the same Wi‑Fi using the machine's local IP

## Main routes

| Route | Description |
|-------|-------------|
| `/` | Home — links to Read, Submit, Curator, Barista, QR |
| `/customer` | Customer reading room — swipe through texts one at a time |
| `/customer/submit` | Submission form |
| `/customer/submit/success` | Success screen |
| `/curator` | Curator dashboard — stats and pending items |
| `/curator/submissions` | Full submissions list |
| `/curator/submissions/:id` | Moderation detail — review, edit, approve, reject, delete |
| `/barista` | Barista display — generate and print texts |
| `/qr` | QR code for customer access |
| `/barista/print/:id` | Standalone print-friendly literary card |

## Customer experience

- Landing page offers two choices: **Read something** or **Submit a text**
- Reading room shows one text at a time, full screen
- Swipe right to like, left to dislike (or tap the heart / X buttons)
- Progress counter shows how many remain
- End state offers to start over or submit a text

## Design system

- Warm paper palette (`#faf6f1` background, `#2c241b` ink, `#7a5c3e` accent)
- Serif typography (Cormorant Garamond) for literary content and headings
- Sans-serif (Source Sans 3) for navigation, buttons, metadata, and admin UI
- Narrow containers (660px reading, 720px default) for intimate reading
- Subtle cards with minimal borders and no heavy shadows
- Rectangular buttons with restrained hover states
- Mobile-first with a single breakpoint at 760px

## Requirements

- Node.js 18+
- npm

## Installation

```bash
npm install
```

## Start the app

```bash
npm start
```

## Default local URL

```text
http://localhost:3000/
```

## Access from another device on the same Wi‑Fi

1. Find your local IP address.
2. Start the app.
3. Open the machine's IP on port 3000 from the phone or another laptop.

Example:

```text
http://192.168.1.25:3000/customer
```

## Find your local IP address

Windows:

```powershell
ipconfig
```

Look for the IPv4 address under your active Wi‑Fi or Ethernet adapter.

If the connection is blocked, allow port 3000 through the firewall (run as Administrator):

```powershell
New-NetFirewallRule -DisplayName "Café App 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

## Database and reset

The SQLite database is stored at:

```text
./data/cafe_writing.db
```

To reset the database:

```bash
rm -rf data
mkdir data
```

Then restart the app to recreate the schema and seed records.

## Seed data

The app seeds demo content automatically on first run if the database is empty.

Included seed data:

- Approved poems and stories
- Approved quotes
- Pending submissions
- Rejected submissions

## Demo workflow

1. Open `/customer` on your phone
2. Tap **Read something** and swipe through texts
3. Tap **Submit a text** to leave your own
4. Open `/curator` to review and approve submissions
5. Open `/barista` to generate and print a literary card
6. Open `/qr` to get a scannable code for the customer page

## Notes

This is intentionally a simple local MVP designed for easy future extension with multiple cafés, accounts, and richer analytics.
>>>>>>> cfdb126 (a)
