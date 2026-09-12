import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from './server.mjs';
import { generatePlan, validatePlan } from './planner.mjs';
import { validateEstimate, validateStartFries, validateVerification } from './fryplan-api.mjs';

const plan = { outcome: 'Start a draft', scope: 'first_session', steps: [{ title: 'Open document', minutes: 1 }] };
const response = value => new Response(JSON.stringify({ choices: [
  { finish_reason: 'stop', message: { content: JSON.stringify(value) } }
] }));
const config = { apiKey: 'test-only', model: 'test-model' };

test('provider request uses DeepSeek JSON mode and returns computed total', async () => {
  const result = await generatePlan({ topic: 'draft' }, { ...config, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    const body = JSON.parse(options.body);
    assert.equal(body.response_format.type, 'json_object');
    assert.equal(body.thinking.type, 'disabled');
    assert.equal(body.messages[0].role, 'system');
    assert.equal(JSON.parse(body.messages[1].content).topic, 'draft');
    return response(plan);
  } });
  assert.equal(result.totalMinutes, 1);
  assert.equal(result.steps.length, 1);
});

test('six steps allowed; seven, empty, duplicate, long and invalid durations rejected', () => {
  const six = { ...plan, steps: Array.from({ length: 6 }, (_, i) => ({ title: `Step ${i}`, minutes: 3 })) };
  assert.equal(validatePlan(six).totalMinutes, 18);
  for (const steps of [[], [...six.steps, { title: 'Seventh', minutes: 1 }],
    [plan.steps[0], plan.steps[0]], [{ title: 'x'.repeat(41), minutes: 1 }],
    ...[0, -1, 1.5, '25', null, 1441].map(minutes => [{ title: 'Task', minutes }]), [{ title: ' ', minutes: 1 }]]) {
    assert.throws(() => validatePlan({ ...plan, steps }), { status: 502 });
  }
});

test('longer estimates are accepted and summed', () => {
  const result = validatePlan({ ...plan, steps: [
    { title: 'Read requirements', minutes: 5 },
    { title: 'Work on assignment', minutes: 45 }
  ] });
  assert.equal(result.totalMinutes, 50);
});

test('bad input and missing configuration never call provider', async () => {
  const options = { ...config, fetchImpl: () => { throw new Error('Should not call'); } };
  for (const input of [null, {}, { topic: ' ' }, { topic: 1 }, { topic: 'x'.repeat(201) }, { topic: 'x', context: 3 }]) {
    await assert.rejects(generatePlan(input, options), { status: 400 });
  }
  await assert.rejects(generatePlan({ topic: 'x' }, { ...options, apiKey: '' }), { status: 503 });
});

test('provider failures, refusal, incomplete output and malformed JSON are explicit errors', async () => {
  const cases = [
    [() => new Response('{}', { status: 429 }), 503],
    [() => new Response('{}', { status: 401 }), 502],
    [() => new Response('{'), 502],
    [() => new Response(JSON.stringify({ choices: [{ finish_reason: 'length' }] })), 502],
    [() => new Response(JSON.stringify({ choices: [{ finish_reason: 'content_filter', message: {} }] })), 422],
    [() => { throw new DOMException('Timeout', 'TimeoutError'); }, 504],
    [() => { throw new Error('Network'); }, 502]
  ];
  for (const [fetchImpl, status] of cases) {
    await assert.rejects(generatePlan({ topic: 'x' }, { ...config, fetchImpl }), { status });
  }
});

test('HTTP endpoint handles valid input, routes, invalid JSON, content type and size', async t => {
  const server = createApi(body => generatePlan(body, { ...config, fetchImpl: async () => response(plan) }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/steps`;
  const post = body => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  assert.equal((await fetch(url)).status, 405);
  assert.equal((await fetch(url + '/missing')).status, 404);
  assert.equal((await fetch(url, { method: 'POST', body: '{}' })).status, 415);
  assert.equal((await post('{')).status, 400);
  assert.equal((await post('{}')).status, 400);
  assert.equal((await post(JSON.stringify({ topic: 'x'.repeat(9000) }))).status, 413);
  const result = await post(JSON.stringify({ topic: 'draft' }));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).totalMinutes, 1);
});

test('new API validators enforce teammate contracts', () => {
  assert.deepEqual(validateEstimate({ time: '2.5小时' }), { time: '2.5小时' });
  assert.deepEqual(validateStartFries({ fries: [
    { title: '打开论文文档', time: '3分钟' },
    { title: '列出小节标题', time: '5分钟' },
    { title: '写一句要点', time: '10分钟' }
  ] }).fries.map(item => item.time), ['3分钟', '5分钟', '10分钟']);
  assert.equal(validateVerification({
    related: true, score: 88, summary: '图片是目录草稿。', evaluation: '与任务对应。', message: '完成得很清楚。'
  }).passed, true);
  assert.equal(validateVerification({
    related: true, score: 50, summary: '图片是准备材料。', evaluation: '只完成部分。', message: '再补一张成果图。'
  }).passed, false);
  assert.throws(() => validateStartFries({ fries: [{ title: '太久', time: '15分钟' }] }), { status: 502 });
});

test('HTTP endpoint exposes estimate, start fries and verify photo routes', async t => {
  const server = createApi(async () => plan, {
    estimateTime: async body => ({ time: `${body.goal.length}分钟` }),
    startFries: async () => ({ fries: [
      { title: '打开书页', time: '3分钟' },
      { title: '读第一页', time: '5分钟' },
      { title: '划出一句', time: '10分钟' }
    ] }),
    verifyPhoto: async () => ({ related: true, score: 90, passed: true, summary: '有成果。', evaluation: '匹配任务。', message: '完成啦。' })
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const root = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body) => fetch(root + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await post('/api/estimate-time', { goal: '读书' })).status, 200);
  assert.equal((await post('/api/start-fries', { goal: '读书' })).status, 200);
  const verification = await post('/api/verify-photo', { goal: '读第一页', image: 'data:image/png;base64,AA==' });
  assert.equal(verification.status, 200);
  assert.equal((await verification.json()).passed, true);
});
