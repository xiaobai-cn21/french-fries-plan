(async () => {
let DURATION = 15 * 60 * 1000;
const KEY = 'fryplan-focus';
const page = document.querySelector('#focus-page');
const dialog = document.querySelector('#finish-dialog');
let remaining = DURATION;
let state = 'running';
let deadline = Date.now() + remaining;
let audioContext;
let oscillator;
let gain;
let soundOn = false;
let sessionId = crypto.randomUUID();
let taskGoal = '';
let taskId = '';
let stepIndex=0,stepCount=0,stepTitle='';
let toastTimeout;
let finishTimeout;

try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if(Number.isInteger(saved?.duration) && saved.duration >= 60000 && saved.duration <= 86400000)DURATION=saved.duration;
  if (saved && ['running', 'paused', 'ended'].includes(saved.state) && Number.isFinite(saved.remaining) && saved.remaining >= 0 && saved.remaining <= DURATION) {
    remaining = saved.remaining;
    sessionId = saved.id || sessionId;
    taskId = saved.taskId || saved.id;
    taskGoal = saved.goal || localStorage.getItem('fryplan-goal') || '';
    stepIndex=saved.stepIndex||0;stepCount=saved.stepCount||0;stepTitle=saved.stepTitle||'';
    state = saved.state;
    if (state === 'running' && Number.isFinite(saved.deadline)) remaining = Math.max(0, Math.min(DURATION, saved.deadline - Date.now()));
    deadline = Date.now() + remaining;
  }
} catch { /* The timer also works without browser storage. */ }

if(!taskGoal){location.replace('../index.html');return;}
try{
  const task=(await FryTasks.available()).find(task=>task.id===taskId);
  if(!task){location.replace('../index.html');return;}
  if(task.steps && task.stepIndex!==stepIndex){await FryTasks.select(taskId);location.reload();return;}
}catch{location.replace('../index.html');return;}

if (taskGoal) {
  document.querySelector('#active-task').textContent = stepCount?stepTitle:taskGoal;
  document.querySelector('#active-task').hidden = false;
}
document.querySelector('.duration').textContent=`/ ${format(DURATION)}`;
if(stepCount){
  const label=document.querySelector('#step-progress');label.hidden=false;label.textContent=`分步启动 · 第 ${stepIndex+1} / ${stepCount} 步`;
  document.querySelector('#finish').querySelector('span:last-child').textContent='完成这一步';
}

function currentRemaining() { return state === 'running' ? Math.max(0, deadline - Date.now()) : remaining; }
function persist() {
  try {
    const session={id:sessionId,taskId,goal:taskGoal,state,remaining:currentRemaining(),deadline,duration:DURATION,stepIndex,stepCount,stepTitle};
    localStorage.setItem(KEY,JSON.stringify(session));FryTasks.snapshot(session);
  } catch { /* Keep the active session in memory if browser storage becomes unavailable. */ }
}
function format(ms) {
  const seconds = Math.ceil(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function update() {
  const left = currentRemaining();
  const progress = Math.min(100, Math.max(0, (DURATION - left) / DURATION * 100));
  const artState = state === 'running' ? 'heating' : state === 'ended' && left === 0 && (!stepCount||stepIndex===stepCount-1) ? 'completed' : 'paused';
  document.querySelector('#oven-art').setState(artState,stepCount?(stepIndex+progress/100)/stepCount:progress/100);
  document.querySelector('#time').textContent = format(left);
  document.title = `${format(left)} · ${state === 'paused' ? '已暂停' : '专注加热'} · FryPlan`;
  document.querySelector('#ring').style.strokeDashoffset = 100 - progress;
  document.querySelector('#progress-fill').style.width = `${progress}%`;
  document.querySelector('#progress').setAttribute('aria-valuenow', Math.floor(progress));
  document.querySelector('#heat-status').replaceChildren(document.createTextNode(state === 'paused' ? '加热已暂停… ' : state === 'ended' ? '本次加热已结束 ' : '正在加热中… '));
  const percent = document.createElement('strong');
  percent.textContent = `${Math.floor(progress)}%`;
  document.querySelector('#heat-status').append(percent);
  page.classList.toggle('paused', state === 'paused');
  page.classList.toggle('ended', state === 'ended');
  document.querySelector('#pause-label').textContent = state === 'paused' ? '继续' : '暂停';
  document.querySelector('#pause-icon').innerHTML = state === 'paused' ? '<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke-width="1"/>' : '<path d="M8 5v14M16 5v14"/>';
  if (state === 'running' && left === 0) finish(true);
}
function setAudioVolume() {
  if (gain && audioContext) gain.gain.setTargetAtTime(soundOn && state === 'running' ? 0.035 : 0, audioContext.currentTime, .15);
}
function pause() {
  remaining = currentRemaining();
  state = 'paused';
  persist(); update(); setAudioVolume();
}
document.querySelector('#pause').addEventListener('click', () => {
  if (state === 'ended') return;
  if (state === 'running') pause();
  else { state = 'running'; deadline = Date.now() + remaining; persist(); update(); setAudioVolume(); }
});
function finish(completed = false) {
  remaining = currentRemaining();
  state = 'ended';
  persist(); setAudioVolume(); update();
  document.querySelector('#finish-title').textContent = completed ? '叮！这根薯条加热好了' : '这次加热，先到这里';
  document.querySelector('#finish-copy').textContent = `本次专注 ${format(DURATION - remaining)}。每一个小小的开始，都值得被看见。`;
  if(stepCount){
    document.querySelector('#finish-title').textContent=completed?'这一步的时间到啦！':'这一步做好了吗？';
    document.querySelector('#finish-copy').textContent=`第 ${stepIndex+1} 步：${stepTitle}`;
    document.querySelector('.verification-note').textContent=stepIndex<stepCount-1?'上传这一步的截图后，再开始下一步。':'上传最后一步的截图，完成这根薯条并获得 3 点能量。';
  }
  clearTimeout(finishTimeout);
  if (completed && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finishTimeout = setTimeout(() => { if (state === 'ended' && !dialog.open) dialog.showModal(); }, 1300);
  } else if (!dialog.open) dialog.showModal();
}
document.querySelector('#finish').addEventListener('click', () => { if (state !== 'ended') finish(); else dialog.showModal(); });
document.querySelector('#exit').addEventListener('click', () => { if (state === 'running') pause(); });
window.addEventListener('pagehide', () => { if (state === 'running') pause(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); else persist(); });
document.querySelector('#sound').addEventListener('click', async () => {
  try {
    if (!audioContext) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      audioContext = new Audio();
      oscillator = audioContext.createOscillator();
      gain = audioContext.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = 110; gain.gain.value = 0;
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start();
    }
    await audioContext.resume();
    soundOn = !soundOn;
    setAudioVolume();
    document.querySelector('#sound').setAttribute('aria-pressed', String(soundOn));
    document.querySelector('#sound').setAttribute('aria-label', soundOn ? '关闭加热环境音' : '开启加热环境音');
  } catch {
    const toast = document.querySelector('#toast');
    toast.textContent = '当前浏览器暂时无法播放环境音。'; toast.classList.add('visible');
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => toast.classList.remove('visible'), 3000);
  }
});
persist(); update();
if (state === 'ended' && !dialog.open) finish(remaining === 0);
setInterval(update, 250);
})();
