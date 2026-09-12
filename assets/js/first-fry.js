const PENDING_KEY = 'fryplan-pending-goal';
const SELECTED_KEY = 'fryplan-selected-fry';
const status = document.querySelector('#status');
let pending;
let minutes = 15;
let selected;

try {
  pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
  selected = JSON.parse(localStorage.getItem(SELECTED_KEY) || 'null');
} catch {
  pending = null;
  selected = null;
}

if (selected?.title) {
  document.body.dataset.mode = 'start';
  minutes = normalizeMinutes(selected.time);
  const recommendedMinutes = minutes;
  document.querySelector('.back-button').href = 'select-fries.html';
  document.querySelector('#first-fry-title').innerHTML = '这是你的<br>第一根薯条！';
  document.querySelector('#goal-title').textContent = selected.title;
  document.querySelector('#time-label').textContent = `${minutes} 分钟`;
  document.querySelector('#task-copy').textContent = selected.subtitle || '先找到和目标相关的一小步，记录基本信息即可。';
  document.querySelector('#confirm').firstChild.textContent = '开始这根薯条 ';
  document.querySelector('#time-choices').hidden = false;
  document.querySelector('#tip-card').hidden = false;
  syncTimeChoices(recommendedMinutes);
} else if (!pending?.goal) {
  location.replace('goal.html');
} else {
  minutes = normalizeMinutes(pending.minutes || pending.time || 15);
  document.querySelector('#goal-title').textContent = pending.goal;
  document.querySelector('#time-label').textContent = `${minutes} 分钟`;
  if (pending.apiEstimate === false && location.protocol !== 'file:') {
    status.textContent = '暂时连不上 API，已用本地估算时间。';
  }
}

function syncTimeChoices(recommendedMinutes) {
  document.querySelectorAll('[data-time]').forEach(button => {
    const isRecommended = normalizeMinutes(button.dataset.time) === recommendedMinutes;
    button.classList.toggle('selected', normalizeMinutes(button.dataset.time) === minutes);
    button.querySelector('[data-recommendation]')?.remove();
    if (isRecommended) button.insertAdjacentHTML('afterbegin', '<span data-recommendation>AI推荐</span>');
  });
  document.querySelector('#time-advice').textContent = `AI 建议 ${recommendedMinutes} 分钟，你也可以按现在的状态调整`;
}

function normalizeMinutes(value) {
  const minutes = Math.round(Number(String(value).match(/\d+/)?.[0]));
  if (!Number.isFinite(minutes)) return 15;
  return Math.min(1440, Math.max(1, minutes));
}

document.querySelectorAll('[data-time]').forEach(button => {
  button.addEventListener('click', () => {
    minutes = normalizeMinutes(button.dataset.time);
    document.querySelector('#time-label').textContent = `${minutes} 分钟`;
    document.querySelectorAll('[data-time]').forEach(item => item.classList.toggle('selected', item === button));
  });
});

document.querySelector('#confirm').addEventListener('click', async () => {
  const button = document.querySelector('#confirm');
  button.disabled = true;
  status.textContent = '';
  try {
    if (selected?.taskId) {
      await FryTasks.startFry(selected.taskId, { title: selected.title, time: `${minutes}分钟` });
      localStorage.removeItem(SELECTED_KEY);
      location.href = 'focus.html';
    } else {
      FryTasks.create(pending.goal, { estimateMinutes: minutes });
      localStorage.removeItem(PENDING_KEY);
      location.href = '../index.html';
    }
  } catch {
    button.disabled = false;
    status.textContent = '暂时无法开始这根薯条，请允许浏览器使用本地存储后重试。';
  }
});
