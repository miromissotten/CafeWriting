const test = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const fs = require('node:fs');

const { createApp } = require('../app');

function uniqueDbPath() {
    return `./tmp-test-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
}

test('customer can submit text and curator can approve it', async () => {
    const dbPath = uniqueDbPath();
    const app = createApp({ dbPath });
    const request = supertest(app);

    try {
        const submitted = await request
            .post('/api/submissions')
            .send({
                title: 'Night Ferry',
                author: 'Mila Hart',
                category: 'Poem',
                content: 'Lanterns on the river keep their own small weather.',
                source: 'Test notebook',
                notes: 'Original demo submission'
            })
            .expect(201);

        assert.equal(submitted.body.status, 'pending');
        assert.equal(submitted.body.title, 'Night Ferry');

        // approval flow
        const approval = await request
            .post('/api/submissions/' + submitted.body.id + '/approve')
            .send({
                adminNote: 'Approved for display.'
            })
            .expect(200);

        assert.equal(approval.body.status, 'approved');

        const barista = await request.get('/api/barista/next-text').expect(200);
        assert.ok(barista.body.text);
        assert.ok(barista.body.title);
        assert.equal(barista.body.status, 'approved');
    } finally {
        app.close();
        fs.rmSync(dbPath, { force: true });
    }
});

test('barista endpoint returns only approved texts and avoids repeats when possible', async () => {
    const dbPath = uniqueDbPath();
    const app = createApp({ dbPath });
    const request = supertest(app);

    try {
        const first = await request.post('/api/submissions').send({
            title: 'First Bloom',
            author: 'A. Reed',
            category: 'Quote',
            content: 'Bloom where you are planted.'
        }).expect(201);

        await request.post('/api/submissions/' + first.body.id + '/approve').expect(200);

        const all = await request.get('/api/barista/next-text').expect(200);
        assert.ok(all.body.title);

        const second = await request.get('/api/barista/next-text').expect(200);
        assert.ok(second.body.title);
        assert.notEqual(all.body.id, second.body.id);
    } finally {
        app.close();
        fs.rmSync(dbPath, { force: true });
    }
});

function parseStatsPayload(html) {
    const match = html.match(/window\.__stats = (\{.*?\});/s);
    assert.ok(match, 'stats payload present in rendered page');
    return JSON.parse(match[1]);
}

test('stats page tracks votes, sessions, and displays with timestamps', async () => {
    const dbPath = uniqueDbPath();
    const app = createApp({ dbPath });
    const request = supertest(app);

    try {
        // barista display logs an event
        await request.get('/api/barista/next-text').expect(200);

        // reader creates a session, views a card, and votes twice
        await request.post('/api/sessions').send({ sessionId: 'sess-1' }).expect(201);
        const texts = await request.get('/api/submissions').expect(200);
        const approved = texts.body.find((t) => t.status === 'approved');
        assert.ok(approved, 'seeded approved text exists');

        await request.post('/api/displays').send({ textId: approved.id, sessionId: 'sess-1' }).expect(201);
        await request.post('/api/votes').send({ textId: approved.id, vote: 'like', sessionId: 'sess-1' }).expect(201);
        await request.post('/api/votes').send({ textId: approved.id, vote: 'like', sessionId: 'sess-1' }).expect(201);

        // validation
        await request.post('/api/votes').send({ textId: approved.id, vote: 'up' }).expect(400);
        await request.post('/api/sessions').send({}).expect(400);
        await request.post('/api/displays').send({}).expect(400);
        await request.post('/api/displays').send({ textId: 999999 }).expect(404);

        const statsRes = await request.get('/curator/stats').expect(200);
        assert.ok(statsRes.text.includes('Stats dashboard'));
        assert.ok(statsRes.text.includes('Reader votes'));
        assert.ok(statsRes.text.includes('class="segmented-button"'));

        const stats = parseStatsPayload(statsRes.text);
        assert.equal(stats.totals.likes, 2, 'two likes recorded');
        assert.equal(stats.totals.dislikes, 0);
        assert.equal(stats.totals.sessions, 1, 'one session recorded');
        assert.equal(stats.totals.displaysBarista, 1, 'barista display recorded');
        assert.equal(stats.totals.displaysReader, 1, 'reader display recorded');
        assert.equal(stats.totals.votesPerSession, 2, 'votes per session derived');
        assert.equal(stats.buckets.length, 30, '30 daily buckets zero-filled');
    } finally {
        app.close();
        fs.rmSync(dbPath, { force: true });
    }
});

test('event log backfills history from existing data on first run', async () => {
    const dbPath = uniqueDbPath();
    const app = createApp({ dbPath });
    const request = supertest(app);

    try {
        const texts = await request.get('/api/submissions').expect(200);
        const approved = texts.body.filter((t) => t.status === 'approved').length;
        const rejected = texts.body.filter((t) => t.status === 'rejected').length;

        const statsRes = await request.get('/curator/stats').expect(200);
        const stats = parseStatsPayload(statsRes.text);

        assert.ok(stats.totals.submissions >= texts.body.length, 'submission history backfilled');
        assert.equal(stats.totals.approvals, approved, 'approval history backfilled');
        assert.equal(stats.totals.rejections, rejected, 'rejection history backfilled');
        assert.equal(stats.totals.sessions, 0, 'no session history to backfill');
    } finally {
        app.close();
        fs.rmSync(dbPath, { force: true });
    }
});
