const test = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const { createApp } = require('../app');

function uniqueDbPath() {
    return `./tmp-test-${Date.now()}-${Math.random().toString(16).slice(2)}.db`;
}

test('customer can submit text and curator can approve it', async () => {
    const dbPath = uniqueDbPath();
    const app = createApp({ dbPath });
    const request = supertest(app);

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
});

test('barista endpoint returns only approved texts and avoids repeats when possible', async () => {
    const dbPath = uniqueDbPath();
    const app = createApp({ dbPath });
    const request = supertest(app);

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
});
