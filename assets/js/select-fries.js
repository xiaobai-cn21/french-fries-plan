const START_KEY = 'fryplan-start-goal';
const SELECTED_KEY = 'fryplan-selected-fry';
const list = document.querySelector('#fries-list');
const status = document.querySelector('#status');
let start;
let fries = [];

try {
  start = JSON.parse(localStorage.getItem(START_KEY) || 'null');
} catch {
  start = null;
}

if (!start?.goal || !start?.taskId) {
  location.replace('../index.html');
} else {
  loadFries();
}

async function loadFries() {
  const submit = document.querySelector('.primary-action');
  submit.disabled = true;
  submit.form.setAttribute('aria-busy', 'true');
  list.innerHTML = '<div class="ai-loading-panel" role="status"><span class="ai-spinner" aria-hidden="true"></span><strong>AI 正在分析目标…</strong><small>正在为你准备合适的小薯条</small></div>';
  status.textContent = '';
  try {
    const result = await getStartFries(start.goal);
    fries = result.fries;
    renderFries();
    status.textContent = '';
    submit.disabled = false;
    submit.form.removeAttribute('aria-busy');
  } catch {
    list.replaceChildren();
    submit.form.removeAttribute('aria-busy');
    status.textContent = '暂时无法生成小薯条，请返回首页重试。';
  }
}

async function getStartFries(goal) {
  try {
    const result = await FryPlanApi.startFries(goal);
    return { fries: result.fries.map((fry, index) => ({
      title: fry.title,
      subtitle: index === 0 ? '最容易立刻开始' : index === 1 ? '继续推进一点点' : '多完成一个小成果',
      time: fry.time,
      level: index === 0 ? '超容易开始' : index === 1 ? '低阻力' : '需要一点专注',
      recommended: index === 1,
      icon: index === 0 ? 'note' : index === 1 ? 'book' : 'list'
    })) };
  } catch {
    status.textContent = '暂时连不上 API，先用本地推荐继续。';
  }
  await new Promise(resolve => setTimeout(resolve, 260));
  return { fries: localStartFries(goal) };
}

function localStartFries(goal) {
  const cleanGoal = String(goal || '').trim().replace(/[，。！？,.!?]+$/g, '');
  const subject = (cleanGoal.replace(/^(完成|开始|学习|阅读|读完|整理|准备|练习|制定|写一份|写|做|进行|坚持)\s*/i, '') || cleanGoal).slice(0, 8);
  let actions;

  if (/读|书|阅读|小说|文章/.test(cleanGoal)) {
    actions = [
      [`打开《${subject}》`, '找到上次读到的位置并做好标记'],
      [`读完《${subject}》前两页`, '只读两页，先让阅读轻松开始'],
      [`记录《${subject}》三点`, '写下三个印象深刻的内容']
    ];
  } else if (/整理|收拾|清理|打扫|房间|桌面/.test(cleanGoal)) {
    actions = [
      [`清出${subject}一小块`, '先处理眼前最容易整理的区域'],
      [`归位${subject}三件物品`, '只挑三件东西放回正确位置'],
      [`整理${subject}十分钟`, '集中完成一个看得见的小区域']
    ];
  } else if (/英语|英文|语言|单词|口语/.test(cleanGoal)) {
    actions = [
      [`打开${subject}学习材料`, '找到今天要使用的一页内容'],
      [`记录${subject}五个词`, '写下五个新词和简单释义'],
      [`练习${subject}三句话`, '朗读并记录三句完整表达']
    ];
  } else if (/运动|健身|跑步|瑜伽|拉伸|训练/.test(cleanGoal)) {
    actions = [
      [`准备${subject}装备`, '换好衣服并把需要的物品放好'],
      [`完成${subject}热身`, '做三分钟简单热身动作'],
      [`练习${subject}五分钟`, '完成一组可以记录的小训练']
    ];
  } else if (/写|论文|报告|文档|作业|方案/.test(cleanGoal)) {
    actions = [
      [`打开${subject}文档`, '打开文件并定位到要继续的位置'],
      [`列出${subject}三个要点`, '先写出三个最基础的内容'],
      [`写完${subject}第一小段`, '完成一段可以保存的小成果']
    ];
  } else {
    actions = [
      [`打开${subject}所需内容`, `为“${cleanGoal}”准备好工具或材料`],
      [`完成${subject}第一小步`, `做一个能推进“${cleanGoal}”的动作`],
      [`推进${subject}十分钟`, `专注完成“${cleanGoal}”的一小部分`]
    ];
  }

  const meta = [
    { time: '3分钟', level: '超容易开始', icon: 'note' },
    { time: '5分钟', level: '低阻力', recommended: true, icon: 'book' },
    { time: '10分钟', level: '需要一点专注', icon: 'list' }
  ];
  return actions.map(([title, subtitle], index) => ({ title, subtitle, ...meta[index] }));
}

function renderFries() {
  list.replaceChildren(...fries.map((fry, index) => {
    const label = document.createElement('label');
    label.className = `fry-option ${fry.recommended ? 'recommended' : ''}`;
    label.innerHTML = `<input type="radio" name="fry" value="${index}" ${fry.recommended ? 'checked' : ''}>
      <span class="fry-art ${fry.icon}" aria-hidden="true"><img src="${fryIcon(fry.icon)}" alt=""></span>
      <span class="fry-copy"><strong></strong><small></small><span class="meta"><b class="time"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></b><b class="level"><svg viewBox="0 0 24 24"><path d="M5 19V9M12 19V5M19 19v-8"/></svg></b></span></span>
      <span class="radio-dot" aria-hidden="true"></span>`;
    label.querySelector('strong').textContent = fry.title;
    label.querySelector('small').textContent = fry.subtitle;
    label.querySelector('.time').append(document.createTextNode(fry.time));
    label.querySelector('.level').append(document.createTextNode(fry.level));
    return label;
  }));
}

function fryIcon(type) {
  return `../assets/images/fry-icon-${type === 'book' ? 'book' : type === 'list' ? 'list' : 'note'}.png`;
}

document.querySelector('#fries-form').addEventListener('submit', event => {
  event.preventDefault();
  const selected = fries[Number(new FormData(event.currentTarget).get('fry'))];
  if (!selected) {
    status.textContent = '先选一根适合现在的薯条吧。';
    return;
  }
  localStorage.setItem(SELECTED_KEY, JSON.stringify({ ...selected, taskId: start.taskId, parentGoal: start.goal }));
  localStorage.removeItem(START_KEY);
  location.href = 'first-fry.html';
});
