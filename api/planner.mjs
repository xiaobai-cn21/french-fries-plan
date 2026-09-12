import { readFileSync } from 'node:fs';

export const prompt = readFileSync(new URL('./prompt.md', import.meta.url), 'utf8');
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function validateInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.topic !== 'string' || !body.topic.trim() || body.topic.length > 200 ||
      (body.context !== undefined && (typeof body.context !== 'string' || body.context.length > 1000))) {
    throw new ApiError(400, 'topic 必须为 1～200 字的目标；context 可选，最多 1000 字。');
  }
  return { topic: body.topic.trim(), context: (body.context || '').trim() };
}

export function validatePlan(plan) {
  const shortText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  if (!plan || !shortText(plan.outcome, 80) || !['full_goal', 'first_session'].includes(plan.scope) ||
      !Array.isArray(plan.steps) || plan.steps.length < 1 || plan.steps.length > 6 ||
      plan.steps.some(step => !step || !shortText(step.title, 40) || (!Number.isInteger(step.minutes) || step.minutes < 1 || step.minutes > 1440)) ||
      new Set(plan.steps.map(step => step.title.trim())).size !== plan.steps.length) {
    throw new ApiError(502, 'AI 返回的步骤不符合要求，请重试。');
  }
  const steps = plan.steps.map(step => ({ title: step.title.trim(), minutes: step.minutes }));
  return { outcome: plan.outcome.trim(), scope: plan.scope, steps,
    totalMinutes: steps.reduce((sum, step) => sum + step.minutes, 0) };
}

export async function generatePlan(body, { apiKey = process.env.DEEPSEEK_API_KEY,
  model = process.env.DEEPSEEK_MODEL || 'deepseek-flash', fetchImpl = fetch } = {}) {
  const input = validateInput(body);
  if (!apiKey || !model) throw new ApiError(503, '请先在服务端配置 DEEPSEEK_API_KEY 和 DEEPSEEK_MODEL。');
  let response;
  try {
    response = await fetchImpl('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ model,
        messages: [{ role: 'system', content: prompt }, { role: 'user', content: JSON.stringify(input) }],
        thinking: { type: 'disabled' }, max_tokens: 2000,
        response_format: { type: 'json_object' } })
    });
  } catch (error) {
    throw new ApiError(error.name === 'TimeoutError' ? 504 : 502, 'AI 服务暂时不可用，请稍后重试。');
  }
  if (!response.ok) throw new ApiError(response.status === 429 ? 503 : 502, 'AI 服务请求失败，请稍后重试。');
  let data;
  try { data = await response.json(); } catch { throw new ApiError(502, 'AI 响应无法解析，请重试。'); }
  const choice = data?.choices?.[0];
  if (choice?.finish_reason === 'content_filter' || choice?.message?.refusal) throw new ApiError(422, '\u65e0\u6cd5\u4e3a\u8fd9\u4e2a\u76ee\u6807\u751f\u6210\u6b65\u9aa4\u3002');
  if (choice?.finish_reason !== 'stop') throw new ApiError(502, 'AI 未能完成拆解，请重试。');
  let plan;
  try { plan = JSON.parse(choice.message?.content || ''); }
  catch { throw new ApiError(502, 'AI 响应无法解析，请重试。'); }
  return validatePlan(plan);
}
