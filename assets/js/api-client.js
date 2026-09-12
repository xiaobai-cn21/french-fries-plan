window.FryPlanApi = (() => {
  const DEEPSEEK_API_KEY = 'your-api-key';
  const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
  const DEEPSEEK_MODEL = 'deepseek-flash';
  const DEEPSEEK_VISION_MODEL = 'deepseek-flash';

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

  const apiKey = () => (
    window.DEEPSEEK_API_KEY ||
    localStorage.getItem('deepseek-api-key') ||
    DEEPSEEK_API_KEY
  ).trim();

  const backendBase = () => (
    window.FRYPLAN_API_BASE ||
    localStorage.getItem('fryplan-api-base') ||
    ''
  ).replace(/\/$/, '');

  async function postBackend(path, body) {
    const base = backendBase();
    if (!base) throw Error('No backend configured');
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) throw Error(data.error || 'API request failed');
    return data;
  }

  async function callDeepSeek(messages, model) {
    const key = apiKey();
    if (!key || key === 'your-api-key') throw Error('Missing DeepSeek API key');
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages,
        response_format: { type: 'json_object' }
      })
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) throw Error(data.error?.message || 'DeepSeek request failed');
    return parseJsonContent(data?.choices?.[0]?.message?.content || '');
  }

  function parseJsonContent(text) {
    const raw = String(text || '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    return JSON.parse(start >= 0 && end >= start ? raw.slice(start, end + 1) : raw);
  }

  function shortText(value, max) {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  }

  function validateEstimate(result) {
    if (!result || !shortText(result.time, 20) || !/^(\d+(\.\d)?)(分钟|小时)$/.test(result.time.trim())) {
      throw Error('Bad estimate response');
    }
    return { time: result.time.trim() };
  }

  function validateStartFries(result) {
    if (!result || !Array.isArray(result.fries) || result.fries.length !== 3) {
      throw Error('Bad fries response');
    }
    return { fries: result.fries.map(item => {
      if (!item || !shortText(item.title, 15) || !shortText(item.time, 10) || !/^\d{1,2}分钟$/.test(item.time.trim())) {
        throw Error('Bad fries response');
      }
      const minutes = Number(item.time.match(/\d+/)[0]);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10) throw Error('Bad fries response');
      return { title: item.title.trim(), time: `${minutes}分钟` };
    }) };
  }

  function validateVerification(result) {
    if (!result || typeof result.related !== 'boolean' || !Number.isInteger(result.score) || result.score < 0 || result.score > 100 ||
        !shortText(result.summary, 120) || !shortText(result.evaluation, 200) || !shortText(result.message, 200)) {
      throw Error('Bad verification response');
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

  async function withBackendFallback(path, body, directCall) {
    try { return await postBackend(path, body); }
    catch { return directCall(); }
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  return {
    estimateTime(goal) {
      return withBackendFallback('/api/estimate-time', { goal }, async () => validateEstimate(await callDeepSeek([
        { role: 'system', content: estimatePrompt },
        { role: 'user', content: `【大目标】${goal}\n请估算完成这个大目标大概需要多久。` }
      ], DEEPSEEK_MODEL)));
    },
    startFries(goal) {
      return withBackendFallback('/api/start-fries', { goal }, async () => validateStartFries(await callDeepSeek([
        { role: 'system', content: startFriesPrompt },
        { role: 'user', content: `【大目标】${goal}\n请生成 3 根开始薯条。` }
      ], DEEPSEEK_MODEL)));
    },
    async verifyPhoto(goal, file) {
      const image = await fileToDataURL(file);
      return withBackendFallback('/api/verify-photo', { goal, image }, async () => validateVerification(await callDeepSeek([
        { role: 'system', content: verifyPhotoPrompt },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: image } },
          { type: 'text', text: `【最小可执行任务】${goal}\n请校验所上传图片是否完成了该任务。` }
        ] }
      ], DEEPSEEK_VISION_MODEL)));
    }
  };
})();
