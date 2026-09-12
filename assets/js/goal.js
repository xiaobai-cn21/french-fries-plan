const input = document.querySelector('#goal');
const counter = document.querySelector('#count');
const feedback = document.querySelector('#feedback');
const suggestions = document.querySelector('#suggestions');
const groups = [
  ['阅读一本书', '整理桌面', '学习英语', '运动20分钟', '完成工作报告', '早睡早起'],
  ['写论文第三章', '复习一门课程', '准备明天的课', '整理参考文献', '练习口语', '制定运动计划'],
  ['收拾房间', '学习一道新菜', '完成一篇日记', '整理本周开支', '准备面试', '读一篇论文']
];
const category = new URLSearchParams(location.search).get('category');
const categoryGroups = {
  '专注学习': ['阅读一本书', '学习英语', '写论文第三章', '复习一门课程', '整理参考文献', '练习口语'],
  '工作任务': ['完成工作报告', '整理桌面', '准备会议', '整理项目资料', '回复工作邮件', '制定本周计划'],
  '健康生活': ['运动20分钟', '早睡早起', '准备健康午餐', '出门散步', '练习拉伸', '制定运动计划'],
  '自我提升': ['阅读一本书', '完成一篇日记', '学习一道新菜', '练习表达', '准备面试', '学习新技能']
};
let groupIndex = 0;
let storageAvailable = true;
const PENDING_KEY = 'fryplan-pending-goal';
try { input.value = (localStorage.getItem('fryplan-goal') || '').slice(0, 50); } catch { storageAvailable = false; }

function update() {
  counter.textContent = input.value.length;
  input.removeAttribute('aria-invalid');
  feedback.textContent = '';
  suggestions.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.textContent === input.value)));
  try { localStorage.setItem('fryplan-goal', input.value); storageAvailable = true; } catch { storageAvailable = false; }
}
function renderSuggestions(items) {
  suggestions.replaceChildren(...items.map(text => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-pressed', String(input.value === text));
    button.addEventListener('click', () => { input.value = text; update(); });
    return button;
  }));
}
renderSuggestions(categoryGroups[category] || groups[0]);
counter.textContent = input.value.length;
input.addEventListener('input', update);
document.querySelector('#refresh').addEventListener('click', () => {
  groupIndex = (groupIndex + 1) % groups.length;
  renderSuggestions(groups[groupIndex]);
});
document.querySelector('#create-goal').addEventListener('submit', event => {
  event.preventDefault();
  createPendingGoal();
});

async function createPendingGoal() {
  if (!input.value.trim()) {
    input.setAttribute('aria-invalid', 'true');
    feedback.textContent = '先写下你想做的事情，再开始第一步吧。';
    input.focus();
    return;
  }
  update();
  const submit = document.querySelector('.generate-button');
  submit.disabled = true;
  submit.form.setAttribute('aria-busy', 'true');
  submit.innerHTML = '<span class="ai-spinner" aria-hidden="true"></span><span>AI 正在估算时间…</span>';
  try {
    const goal = input.value.trim();
    const estimate = await estimateTime(goal);
    localStorage.setItem('fryplan-goal', goal);
    localStorage.setItem(PENDING_KEY, JSON.stringify({ goal, minutes: estimate.minutes, apiEstimate: estimate.fromApi, createdAt: new Date().toISOString() }));
    localStorage.removeItem('fryplan-goal');
    window.location.href = 'first-fry.html';
  } catch {
    feedback.textContent = '暂时无法准备这根薯条，请检查浏览器存储权限后重试。';
    submit.disabled = false;
    submit.form.removeAttribute('aria-busy');
    submit.innerHTML = '生成新的薯条 <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  }
}

async function estimateTime(goal) {
  try {
    const result = await FryPlanApi.estimateTime(goal);
    return { minutes: normalizeEstimatedMinutes(result.time), fromApi: true };
  } catch {
    return { minutes: estimateLocally(goal), fromApi: false };
  }
}

function normalizeEstimatedMinutes(value) {
  const match = String(value || '').match(/^(\d+(?:\.\d)?)(分钟|小时)$/);
  if (!match) return 15;
  const amount = Number(match[1]);
  const minutes = match[2] === '小时' ? Math.round(amount * 60) : Math.round(amount);
  return Math.min(1440, Math.max(1, minutes));
}

function estimateLocally(goal) {
  const text = String(goal || '');
  const minute = text.match(/(\d{1,4})\s*分钟/);
  if (minute) return Math.min(1440, Math.max(1, Number(minute[1])));
  const hour = text.match(/(\d+(?:\.\d)?)\s*(小时|个小时)/);
  if (hour) return Math.min(1440, Math.max(1, Math.round(Number(hour[1]) * 60)));
  if (/喝|倒|发一条|回一封|打开|看一眼/.test(text)) return 3;
  if (/写|读|学习|整理|运动|健身|训练|复习|准备|完成/.test(text)) return 25;
  return 10;
}
