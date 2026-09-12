import { ApiError } from './planner.mjs';

const URL = 'https://api.deepseek.com/chat/completions';
const textModel = () => process.env.DEEPSEEK_MODEL || 'deepseek-flash';
const visionModel = () => process.env.DEEPSEEK_VISION_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-flash';

const estimatePrompt = `你是薯条计划的任务助手。
背景信息：用户设定了一个【大目标】。你的职责是估算：一个普通用户完成这个大目标，大概需要投入多久。

估算规则：
- 估算口径：普通人以正常专注状态投入的净时长，不含睡觉、拖延、等待；
- 一次性活动按单次时长估算；
- 长期项目按完成它需要的累计专注时长估算；
- 按普通水平估算，不给范围，只给一个数。

输出格式规则：
- 单位只允许「小时」或「分钟」两种；
- 不足 1 小时用分钟，达到或超过 1 小时用小时，小时最多一位小数。

只输出 JSON，不要输出解释或 Markdown。格式固定为：
{"time":"3小时"}`;

const startFriesPrompt = `你是薯条计划的任务助手。
背景信息：用户设定了一个【大目标】，但常常因为目标太大而不敢开始。你的职责是把大目标拆成 3 根「开始薯条」。

拆任务规则：
- 每根薯条必须是 10 分钟以内可以完成或启动的具体动作，门槛越低越好；
- 优先给启动型任务，例如抵达现场、打开文档、读第一页；
- 每根薯条完成后必须能拍一张照片作为成果凭证；
- 禁止纯脑内任务，例如想一想、规划一下、默背；
- title 只描述任务动作本身，不要把拍照写进标题；
- 3 根薯条按门槛从低到高排列；
- title 不超过 15 个字；
- time 格式如「3分钟」。

只输出 JSON，不要输出解释或 Markdown。格式固定为：
{"fries":[{"title":"小任务名","time":"3分钟"},{"title":"小任务名","time":"5分钟"},{"title":"小任务名","time":"10分钟"}]}`;

const verifyPhotoPrompt = `你是薯条计划的任务助手。
背景信息：用户预先选定了一个【最小可执行任务】，用户上传图片作为该任务的成果凭证。

你的任务：
1. 识别图片全部内容，客观提炼图片中的产出成果，严禁编造图片不存在的信息。
2. 将图片成果和【最小可执行任务】做匹配度校验，判断用户是否完成本次任务。
3. 撰写简短真诚、有力量的鼓励话术，结合本次产出做针对性肯定。

评分规则：
- 图片中有与任务直接对应的实际产出，80-100；
- 能看出做了相关准备或部分完成，40-70；
- 与任务无关、或看不出任何与任务相关的产出，0-30；
- 图片模糊或无法识别时如实说明，不要猜测。

只输出 JSON，不要输出解释或 Markdown。格式固定为：
{"related":true,"score":88,"summary":"一句话概括图片中的产出内容","evaluation":"对照最小任务说明完成情况，1-2句","message":"给用户的反馈鼓励"}`;

function shortText(value, max) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function parseJsonContent(data) {
  const choice = data?.choices?.[0];
  if (choice?.finish_reason === 'content_filter' || choice?.message?.refusal) throw new ApiError(422, 'AI 拒绝处理这个请求。');
  if (choice?.finish_reason && choice.finish_reason !== 'stop') throw new ApiError(502, 'AI 未能完成请求，请重试。');
  const raw = String(choice?.message?.content || '').trim();
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  try { return JSON.parse(start >= 0 && end >= start ? raw.slice(start, end + 1) : raw); }
  catch { throw new ApiError(502, 'AI 响应无法解析，请重试。'); }
}

async function callDeepSeek(body, { apiKey = process.env.DEEPSEEK_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new ApiError(503, '请先在服务端配置 DEEPSEEK_API_KEY。');
  let response;
  try {
    response = await fetchImpl(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new ApiError(error.name === 'TimeoutError' ? 504 : 502, 'AI 服务暂时不可用，请稍后重试。');
  }
  if (!response.ok) throw new ApiError(response.status === 429 ? 503 : 502, 'AI 服务请求失败，请稍后重试。');
  try { return parseJsonContent(await response.json()); }
  catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(502, 'AI 响应无法解析，请重试。'); }
}

function normalizeGoal(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !shortText(body.goal, 200)) {
    throw new ApiError(400, 'goal 必须为 1～200 字。');
  }
  return body.goal.trim();
}

export function validateEstimate(result) {
  if (!result || !shortText(result.time, 20) || !/^(\d+(\.\d)?)(分钟|小时)$/.test(result.time.trim())) {
    throw new ApiError(502, 'AI 返回的时间不符合要求，请重试。');
  }
  return { time: result.time.trim() };
}

export async function estimateTime(body, options) {
  const goal = normalizeGoal(body);
  const result = await callDeepSeek({
    model: textModel(),
    temperature: 0.1,
    messages: [
      { role: 'system', content: estimatePrompt },
      { role: 'user', content: `【大目标】${goal}\n请估算完成这个大目标大概需要多久。` }
    ],
    response_format: { type: 'json_object' }
  }, options);
  return validateEstimate(result);
}

export function validateStartFries(result) {
  if (!result || !Array.isArray(result.fries) || result.fries.length !== 3) {
    throw new ApiError(502, 'AI 返回的小薯条不符合要求，请重试。');
  }
  return { fries: result.fries.map(item => {
    if (!item || !shortText(item.title, 15) || !shortText(item.time, 10) || !/^\d{1,2}分钟$/.test(item.time.trim())) {
      throw new ApiError(502, 'AI 返回的小薯条不符合要求，请重试。');
    }
    const minutes = Number(item.time.match(/\d+/)[0]);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10) throw new ApiError(502, 'AI 返回的小薯条不符合要求，请重试。');
    return { title: item.title.trim(), time: `${minutes}分钟` };
  }) };
}

export async function startFries(body, options) {
  const goal = normalizeGoal(body);
  const result = await callDeepSeek({
    model: textModel(),
    temperature: 0.1,
    messages: [
      { role: 'system', content: startFriesPrompt },
      { role: 'user', content: `【大目标】${goal}\n请生成 3 根开始薯条。` }
    ],
    response_format: { type: 'json_object' }
  }, options);
  return validateStartFries(result);
}

function normalizeImageData(value) {
  if (typeof value !== 'string') throw new ApiError(400, 'image 必须是 data URL。');
  const match = value.match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new ApiError(400, 'image 必须是 PNG 或 JPG 的 data URL。');
  if (match[2].length > 14_000_000) throw new ApiError(413, '图片较大，请选择 10 MB 以内的图片。');
  return value;
}

export function validateVerification(result) {
  if (!result || typeof result.related !== 'boolean' || !Number.isInteger(result.score) || result.score < 0 || result.score > 100 ||
      !shortText(result.summary, 120) || !shortText(result.evaluation, 200) || !shortText(result.message, 200)) {
    throw new ApiError(502, 'AI 返回的图片校验结果不符合要求，请重试。');
  }
  return {
    related: result.related,
    score: result.score,
    passed: result.related && result.score >= 60,
    summary: result.summary.trim(),
    evaluation: result.evaluation.trim(),
    message: result.message.trim()
  };
}

export async function verifyPhoto(body, options) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !shortText(body.goal, 200)) {
    throw new ApiError(400, 'goal 必须为 1～200 字。');
  }
  const image = normalizeImageData(body.image);
  const result = await callDeepSeek({
    model: visionModel(),
    temperature: 0.1,
    messages: [
      { role: 'system', content: verifyPhotoPrompt },
      { role: 'user', content: [
        { type: 'image_url', image_url: { url: image } },
        { type: 'text', text: `【最小可执行任务】${body.goal.trim()}\n请校验所上传图片是否完成了该任务。` }
      ] }
    ],
    response_format: { type: 'json_object' }
  }, options);
  return validateVerification(result);
}
