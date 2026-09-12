const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');
const QRCode = require('qrcode');

function createApp(options = {}) {
    const dbPath = options.dbPath || path.join(__dirname, 'data', 'cafe_writing.db');
    const dataDir = path.dirname(dbPath);
    fs.mkdirSync(dataDir, { recursive: true });

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
    CREATE TABLE IF NOT EXISTS texts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      source TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      rejection_reason TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_at TEXT,
      last_displayed_at TEXT,
      display_count INTEGER NOT NULL DEFAULT 0
    );
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS text_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text_id INTEGER NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
      vote TEXT NOT NULL CHECK (vote IN ('like','dislike')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_text_votes_text_id ON text_votes(text_id);
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS event_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      text_id INTEGER REFERENCES texts(id) ON DELETE SET NULL,
      session_id TEXT,
      created_at TEXT NOT NULL
    );
  `);

    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON event_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_event_log_type ON event_log(event_type);
  `);

    const seedCount = db.prepare('SELECT COUNT(*) AS total FROM texts').get().total;
    if (seedCount === 0) {
        const demoTexts = [
            {
                title: 'Morning Window',
                author: 'Aster Vale',
                category: 'Poem',
                content: 'The window keeps a patient light.\nA cup warms my hand.\nAcross the street, the bakery opens its small gold door.\nEvery day returns like a quiet promise.',
                source: 'Original demo poem',
                status: 'approved',
                approved_at: new Date().toISOString(),
                last_displayed_at: null,
                display_count: 0,
                notes: 'Demo seed text'
            },
            {
                title: 'The Quiet Table',
                author: 'Iris Morrow',
                category: 'Short story',
                content: 'At the back table, the old man read by the window and never once looked up when the kettle sang.\nA woman in a red coat left one biscuit beside his cup.\nBy noon they were speaking in the language of weather and books, and somehow the room had become a country.',
                source: 'Original demo story',
                status: 'approved',
                approved_at: new Date().toISOString(),
                last_displayed_at: null,
                display_count: 0,
                notes: 'Demo seed text'
            },
            {
                title: 'The Measure of a Day',
                author: 'Lena Brooks',
                category: 'Quote',
                content: 'The day is not measured by the hours, but by the moments that feel like home.',
                source: 'Original demo quote',
                status: 'approved',
                approved_at: new Date().toISOString(),
                last_displayed_at: null,
                display_count: 0,
                notes: 'Demo seed text'
            },
            {
                title: 'Rain in the Courtyard',
                author: 'Jules Rowan',
                category: 'Poem',
                content: 'Rain taps the courtyard stones.\nThe pear tree does not hurry.\nEven the shadows lean closer to the wall, listening for the sky to speak.',
                source: 'Original demo poem',
                status: 'approved',
                approved_at: new Date().toISOString(),
                last_displayed_at: null,
                display_count: 0,
                notes: 'Demo seed text'
            },
            {
                title: 'The Bookshop on Third',
                author: 'Harper Finch',
                category: 'Short story',
                content: 'When the shop bell rang, everyone looked up as if the room had remembered something important.\nThe girl at the counter slid a paperback across the wooden surface and said, “This one will find the right person.”\nNo one argued with the weather of her certainty.',
                source: 'Original demo story',
                status: 'approved',
                approved_at: new Date().toISOString(),
                last_displayed_at: null,
                display_count: 0,
                notes: 'Demo seed text'
            },
            {
                title: 'Keep a Margin',
                author: 'Anonymous',
                category: 'Quote',
                content: 'Leave room for wonder; it is the most generous thing you can do for a day.',
                source: 'Original demo quote',
                status: 'approved',
                approved_at: new Date().toISOString(),
                last_displayed_at: null,
                display_count: 0,
                notes: 'Demo seed text'
            },
            {
                title: 'Velvet Evening',
                author: 'Nora Bell',
                category: 'Poem',
                content: 'The evening folds itself into velvet.\nStreet lamps lift their small amber lanterns.\nEven the silence hums a little, as if it is trying to remember the tune.',
                source: 'Original demo poem',
                status: 'approved',
                approved_at: new Date().toISOString(),
                last_displayed_at: null,
                display_count: 0,
                notes: 'Demo seed text'
            },
            {
                title: 'The Last Chair',
                author: 'S. Alden',
                category: 'Short story',
                content: 'He arrived before the rain and took the last chair by the window.\nThe room smelled of coffee and cedar.\nBy the second cup, a girl from the counter had sat across from him and asked, “What are you reading?” and the answer was simply, “The hour.”',
                source: 'Original demo story',
                status: 'approved',
                approved_at: new Date().toISOString(),
                last_displayed_at: null,
                display_count: 0,
                notes: 'Demo seed text'
            },
            {
                title: 'A Little Room for Wonder',
                author: 'Lucian East',
                category: 'Quote',
                content: 'A good life is made of small, deliberate pauses and one honest sentence spoken at the right hour.',
                source: 'Original demo quote',
                status: 'approved',
                approved_at: new Date().toISOString(),
                last_displayed_at: null,
                display_count: 0,
                notes: 'Demo seed text'
            },
            {
                title: 'Lantern Notes',
                author: 'Maya Sel',
                category: 'Poem',
                content: 'The walk home is lit by ordinary light.\nA shop sign. A bicycle bell.\nEach small glow tells me the city is still making room for tenderness.',
                source: 'Original demo poem',
                status: 'pending',
                approved_at: null,
                last_displayed_at: null,
                display_count: 0,
                notes: 'Pending review'
            },
            {
                title: 'A Shelf of Rain',
                author: 'Theo Park',
                category: 'Short story',
                content: 'The library door opened to a drift of rain and a woman with wet shoes, carrying a satchel full of paper birds.\nWhen she spoke it was like turning a page in the dark.',
                source: 'Original demo story',
                status: 'pending',
                approved_at: null,
                last_displayed_at: null,
                display_count: 0,
                notes: 'Pending review'
            },
            {
                title: 'Sun Shop',
                author: 'J. M. Patel',
                category: 'Quote',
                content: 'Some mornings arrive like a cup of sunlight, and we are lucky to be there when it is poured.',
                source: 'Original demo quote',
                status: 'rejected',
                rejection_reason: 'Needs a stronger final line and more polished phrasing.',
                approved_at: null,
                last_displayed_at: null,
                display_count: 0,
                notes: 'Rejected submission'
            }
        ];

        const insertText = db.prepare(`
      INSERT INTO texts (title, author, content, category, source, notes, status, rejection_reason, approved_at, last_displayed_at, display_count)
      VALUES (@title, @author, @content, @category, @source, @notes, @status, @rejection_reason, @approved_at, @last_displayed_at, @display_count)
    `);

        const insertMany = db.transaction((items) => {
            for (const item of items) {
                insertText.run({
                    ...item,
                    rejection_reason: item.rejection_reason ?? null,
                    approved_at: item.approved_at ?? null,
                    last_displayed_at: item.last_displayed_at ?? null,
                    display_count: item.display_count ?? 0
                });
            }
        });

        insertMany(demoTexts);
    }

    function toIsoTimestamp(value) {
        if (!value) return null;
        return value.includes('T')
            ? value.replace(/Z$/, '') + 'Z'
            : value.replace(' ', 'T') + 'Z';
    }

    function logEvent(eventType, { textId = null, sessionId = null } = {}) {
        db.prepare(
            'INSERT INTO event_log (event_type, text_id, session_id, created_at) VALUES (?, ?, ?, ?)'
        ).run(eventType, textId ?? null, sessionId ?? null, new Date().toISOString());
    }

    function backfillEventLog() {
        const count = db.prepare('SELECT COUNT(*) AS total FROM event_log').get().total;
        if (count > 0) return;

        const insert = db.prepare(
            'INSERT INTO event_log (event_type, text_id, session_id, created_at) VALUES (?, ?, ?, ?)'
        );

        const backfill = db.transaction(() => {
            const votes = db.prepare('SELECT text_id, vote, created_at FROM text_votes').all();
            for (const vote of votes) {
                insert.run(`vote_${vote.vote}`, vote.text_id, null, toIsoTimestamp(vote.created_at));
            }

            const texts = db.prepare('SELECT id, created_at, approved_at, updated_at, status FROM texts').all();
            for (const text of texts) {
                insert.run('submission_created', text.id, null, toIsoTimestamp(text.created_at));
                if (text.approved_at) {
                    insert.run('submission_approved', text.id, null, toIsoTimestamp(text.approved_at));
                }
                if (text.status === 'rejected') {
                    insert.run('submission_rejected', text.id, null, toIsoTimestamp(text.updated_at));
                }
            }
        });

        backfill();
    }

    backfillEventLog();

    const app = express();

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    function getTextById(id) {
        return db.prepare('SELECT * FROM texts WHERE id = ?').get(id);
    }

    function listApprovedTexts() {
        return db.prepare(
            `SELECT * FROM texts
       WHERE status = 'approved'
       ORDER BY last_displayed_at IS NULL DESC,
                COALESCE(last_displayed_at, '1970-01-01T00:00:00Z') ASC,
                display_count ASC,
                COALESCE(approved_at, '1970-01-01T00:00:00Z') DESC,
                id ASC`
        ).all();
    }

    function fetchSubmissions() {
        return db.prepare(`
      SELECT * FROM texts
      ORDER BY CASE status
        WHEN 'pending' THEN 0
        WHEN 'approved' THEN 1
        WHEN 'rejected' THEN 2
        ELSE 3
      END, created_at DESC
    `).all();
    }

    function selectNextText() {
        const approvedTexts = listApprovedTexts();
        if (approvedTexts.length === 0) {
            return null;
        }

        const next = approvedTexts[0];
        const now = new Date().toISOString();
        db.prepare(`
      UPDATE texts
      SET last_displayed_at = ?, display_count = display_count + 1, updated_at = ?
      WHERE id = ?
    `).run(now, now, next.id);
        logEvent('display_barista', { textId: next.id });

        return getTextById(next.id);
    }

    function getVoteStats(textId) {
        const row = db.prepare(`
      SELECT
        SUM(CASE WHEN vote = 'like' THEN 1 ELSE 0 END) AS likes,
        SUM(CASE WHEN vote = 'dislike' THEN 1 ELSE 0 END) AS dislikes
      FROM text_votes
      WHERE text_id = ?
    `).get(textId);
        return {
            likes: row.likes || 0,
            dislikes: row.dislikes || 0,
            score: (row.likes || 0) - (row.dislikes || 0)
        };
    }

    function getAllVoteStats() {
        const rows = db.prepare(`
      SELECT
        t.id,
        t.title,
        t.author,
        t.category,
        t.status,
        SUM(CASE WHEN v.vote = 'like' THEN 1 ELSE 0 END) AS likes,
        SUM(CASE WHEN v.vote = 'dislike' THEN 1 ELSE 0 END) AS dislikes
      FROM texts t
      LEFT JOIN text_votes v ON v.text_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `).all();
        return rows.map((row) => ({
            id: row.id,
            title: row.title,
            author: row.author,
            category: row.category,
            status: row.status,
            likes: row.likes || 0,
            dislikes: row.dislikes || 0,
            score: (row.likes || 0) - (row.dislikes || 0)
        }));
    }

    function getActivityStats({ days = 30 } = {}) {
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        start.setUTCDate(start.getUTCDate() - (days - 1));
        const startKey = start.toISOString();

        const bucketKeys = {
            vote_like: 'likes',
            vote_dislike: 'dislikes',
            submission_created: 'submissions',
            submission_approved: 'approvals',
            submission_rejected: 'rejections',
            display_barista: 'displaysBarista',
            display_reader: 'displaysReader',
            session_started: 'sessions'
        };

        const buckets = [];
        const indexByDate = new Map();
        for (let i = 0; i < days; i++) {
            const day = new Date(start);
            day.setUTCDate(start.getUTCDate() + i);
            const bucket = {
                date: day.toISOString().slice(0, 10),
                likes: 0,
                dislikes: 0,
                submissions: 0,
                approvals: 0,
                rejections: 0,
                displaysBarista: 0,
                displaysReader: 0,
                sessions: 0
            };
            buckets.push(bucket);
            indexByDate.set(bucket.date, bucket);
        }

        const totals = {
            likes: 0,
            dislikes: 0,
            submissions: 0,
            approvals: 0,
            rejections: 0,
            displaysBarista: 0,
            displaysReader: 0,
            sessions: 0
        };

        const events = db.prepare(
            'SELECT event_type, created_at FROM event_log WHERE created_at >= ? ORDER BY created_at ASC'
        ).all(startKey);

        for (const event of events) {
            const key = bucketKeys[event.event_type];
            const bucket = indexByDate.get(event.created_at.slice(0, 10));
            if (!key || !bucket) continue;
            bucket[key]++;
            totals[key]++;
        }

        const totalVotes = totals.likes + totals.dislikes;
        const totalDisplays = totals.displaysBarista + totals.displaysReader;

        return {
            days,
            totals: {
                ...totals,
                votes: totalVotes,
                displays: totalDisplays,
                votesPerSession: totals.sessions > 0 ? Math.round((totalVotes / totals.sessions) * 10) / 10 : 0
            },
            buckets
        };
    }

    app.get('/', (req, res) => {
        const customerUrl = `${req.protocol}://${req.get('host')}/customer`;
        res.render('home', { customerUrl });
    });

    app.get('/customer', (req, res) => {
        const approvedTexts = listApprovedTexts();
        res.render('customer', { texts: approvedTexts, pageTitle: 'Customer reading room' });
    });

    app.get('/customer/submit', (req, res) => {
        res.render('customer-submit', { pageTitle: 'Submit a text' });
    });

    app.get('/customer/submit/success', (req, res) => {
        res.render('customer-success', { pageTitle: 'Thanks for your submission' });
    });

    app.get('/qr', async (req, res) => {
        const targetUrl = `${req.protocol}://${req.get('host')}/customer`;
        const qrDataUrl = await QRCode.toDataURL(targetUrl, { margin: 1, width: 240 });
        res.render('qr', { qrDataUrl, targetUrl });
    });

    app.get('/curator', (req, res) => {
        const submissions = fetchSubmissions();
        const voteStats = getAllVoteStats();
        const stats = {
            total: submissions.length,
            pending: submissions.filter((item) => item.status === 'pending').length,
            approved: submissions.filter((item) => item.status === 'approved').length,
            rejected: submissions.filter((item) => item.status === 'rejected').length
        };

        const recent = submissions.filter((item) => item.status === 'pending').slice(0, 6);
        res.render('curator', { submissions: recent, stats, voteStats, pageTitle: 'Curator dashboard' });
    });

    app.get('/curator/stats', (req, res) => {
        const voteStats = getAllVoteStats();
        const stats = getActivityStats({ days: 30 });
        res.render('curator-stats', { voteStats, stats, pageTitle: 'Stats dashboard' });
    });

    app.get('/curator/submissions', (req, res) => {
        const submissions = fetchSubmissions();
        res.render('curator-list', { submissions, pageTitle: 'All submissions' });
    });

    app.get('/curator/submissions/:id', (req, res) => {
        const submission = getTextById(req.params.id);
        if (!submission) {
            return res.status(404).send('Submission not found.');
        }

        res.render('curator-detail', { submission, pageTitle: `Review: ${submission.title}` });
    });

    app.get('/barista', (req, res) => {
        res.render('barista', { pageTitle: 'Barista display' });
    });

    app.get('/barista/print/:id', (req, res) => {
        const text = getTextById(req.params.id);
        if (!text) {
            return res.status(404).send('Text not found.');
        }

        res.render('print-card', { text, pageTitle: text.title });
    });

    app.get('/api/submissions', (req, res) => {
        res.json(fetchSubmissions());
    });

    app.post('/api/submissions', (req, res) => {
        const { title, author, category, content, source, notes } = req.body || {};

        if (!title || !author || !category || !content) {
            return res.status(400).json({ error: 'Title, author, category, and content are required.' });
        }

        const validCategories = ['Poem', 'Short story', 'Quote', 'Other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Category is invalid.' });
        }

        const created = db.prepare(`
      INSERT INTO texts (title, author, category, content, source, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(title.trim(), author.trim(), category, content.trim(), source ? source.trim() : null, notes ? notes.trim() : null);

        const row = getTextById(created.lastInsertRowid);
        logEvent('submission_created', { textId: created.lastInsertRowid });
        res.status(201).json(row);
    });

    app.post('/api/submissions/:id', (req, res) => {
        const existing = getTextById(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Submission not found.' });
        }

        const { title, author, category, content, source, notes } = req.body || {};
        if (!title || !author || !category || !content) {
            return res.status(400).json({ error: 'Title, author, category, and content are required.' });
        }

        db.prepare(`
      UPDATE texts
      SET title = ?, author = ?, category = ?, content = ?, source = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title.trim(), author.trim(), category, content.trim(), source ? source.trim() : null, notes ? notes.trim() : null, req.params.id);
        logEvent('text_updated', { textId: req.params.id });

        const updated = getTextById(req.params.id);
        res.json(updated);
    });

    app.post('/api/submissions/:id/approve', (req, res) => {
        const text = getTextById(req.params.id);
        if (!text) {
            return res.status(404).json({ error: 'Submission not found.' });
        }

        db.prepare(`
      UPDATE texts
      SET status = 'approved', rejection_reason = NULL, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);
        logEvent('submission_approved', { textId: req.params.id });

        const updated = getTextById(req.params.id);
        res.json(updated);
    });

    app.post('/api/submissions/:id/reject', (req, res) => {
        const text = getTextById(req.params.id);
        if (!text) {
            return res.status(404).json({ error: 'Submission not found.' });
        }

        const reason = (req.body && req.body.reason) ? req.body.reason.trim() : 'No reason provided.';
        db.prepare(`
      UPDATE texts
      SET status = 'rejected', rejection_reason = ?, approved_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason, req.params.id);
        logEvent('submission_rejected', { textId: req.params.id });

        const updated = getTextById(req.params.id);
        res.json(updated);
    });

    app.delete('/api/submissions/:id', (req, res) => {
        const text = getTextById(req.params.id);
        if (!text) {
            return res.status(404).json({ error: 'Submission not found.' });
        }

        db.prepare('DELETE FROM texts WHERE id = ?').run(req.params.id);
        logEvent('submission_deleted', { textId: req.params.id });
        res.json({ success: true, deletedId: Number(req.params.id) });
    });

    app.get('/api/barista/next-text', (req, res) => {
        const selected = selectNextText();
        if (!selected) {
            return res.status(404).json({ error: 'No approved texts available yet.' });
        }

        res.json({
            ...selected,
            text: selected.content,
            approved_at: selected.approved_at || null
        });
    });

    app.get('/api/qr', async (req, res) => {
        const targetUrl = `${req.protocol}://${req.get('host')}/customer`;
        const qrDataUrl = await QRCode.toDataURL(targetUrl, { margin: 1, width: 280 });
        res.json({ url: targetUrl, qrCode: qrDataUrl });
    });

    app.get('/api/votes', (req, res) => {
        const stats = getAllVoteStats();
        res.json(stats);
    });

    app.get('/api/votes/:textId', (req, res) => {
        const stats = getVoteStats(req.params.textId);
        res.json(stats);
    });

    app.post('/api/votes', (req, res) => {
        const { textId, vote, sessionId } = req.body || {};

        if (!textId || !vote || !['like', 'dislike'].includes(vote)) {
            return res.status(400).json({ error: 'textId and vote (like/dislike) are required.' });
        }

        const text = getTextById(textId);
        if (!text) {
            return res.status(404).json({ error: 'Text not found.' });
        }

        db.prepare('INSERT INTO text_votes (text_id, vote) VALUES (?, ?)').run(textId, vote);
        logEvent(`vote_${vote}`, { textId, sessionId });
        const stats = getVoteStats(textId);
        res.status(201).json({ textId, vote, stats });
    });

    app.post('/api/sessions', (req, res) => {
        const { sessionId } = req.body || {};
        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId is required.' });
        }

        logEvent('session_started', { sessionId });
        res.status(201).json({ sessionId });
    });

    app.post('/api/displays', (req, res) => {
        const { textId, sessionId } = req.body || {};
        if (!textId) {
            return res.status(400).json({ error: 'textId is required.' });
        }

        const text = getTextById(textId);
        if (!text) {
            return res.status(404).json({ error: 'Text not found.' });
        }

        logEvent('display_reader', { textId, sessionId });
        res.status(201).json({ textId, sessionId });
    });

    app.close = () => db.close();
    return app;
}

if (require.main === module) {
    const app = createApp();
    const port = Number(process.env.PORT || 3000);
    app.listen(port, '0.0.0.0', () => {
        console.log(`Café Writing Sharing app running at http://localhost:${port}`);
        console.log(`Customer QR URL: http://localhost:${port}/customer`);
    });
}

module.exports = { createApp };
