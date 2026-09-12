const infoDialog = document.querySelector('#info-dialog');

document.querySelectorAll('[data-create]').forEach(button => {
  button.addEventListener('click', () => {
    const category = button.dataset.category;
    window.location.href = category ? `pages/goal.html?category=${encodeURIComponent(category)}` : 'pages/goal.html';
  });
});

document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelectorAll('.close-button, .close-button-text').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
});
const panels = {
  '专注': ['⏱️', '从第一步，进入专注', '还没有正在加热的薯条。先在首页写下你的目标吧。计时与加热功能将在后续页面开放。'],
  '伙伴': ['🍟', '你好，我是你的小薯条', 'Lv.1 · 小薯条。陪你从一个小行动开始，一点点变成更好的自己。伙伴成长功能将在后续开放。'],
  '我的': ['☀️', '每一个开始，都值得记录', '你还没有完成记录。未来，你的薯条成果和行动足迹都会在这里相遇。']
};
document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.panel === '专注') {
    document.querySelector('#task-carton').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    document.querySelector('#task-guidance').textContent=homeTasks.length?'随手抽一根，看看这次的小任务。':'还没有任务，先用下方「目标」入口添加吧。';
    return;
  }
  if (button.dataset.panel === '伙伴') { window.location.href = 'pages/companion.html'; return; }
  if (button.dataset.panel === '我的') { window.location.href = 'pages/profile.html'; return; }
  const [emoji, title, copy] = panels[button.dataset.panel];
  document.querySelector('#info-emoji').textContent = emoji;
  document.querySelector('#info-title').textContent = title;
  document.querySelector('#info-copy').textContent = copy;
  infoDialog.showModal();
}));
let toastTimer;
document.querySelector('#reminder').addEventListener('click', () => {
  const toast = document.querySelector('#toast');
  toast.textContent = '今天没有新提醒，按自己的节奏开始吧。';
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
});
const weekday = (new Date().getDay() + 6) % 7;
document.querySelectorAll('.week > div')[weekday].classList.add('today');

FryProgress.read().then(items=>{
  const summary=FryProgress.summarize(items);
  document.querySelector('.streak-count strong').textContent=summary.streak;
  document.querySelector('.energy strong').textContent=20+summary.energy;
  document.querySelector('.week').setAttribute('aria-label','本周行动记录');
  const monday=new Date();monday.setHours(12,0,0,0);monday.setDate(monday.getDate()-weekday);
  document.querySelectorAll('.week>div').forEach((day,index)=>{
    const date=new Date(monday);date.setDate(date.getDate()+index);
    if(summary.days.has(FryProgress.dayKey(date))){day.querySelector('i').style.background='#ffac35';day.setAttribute('aria-label','已完成行动');}
  });
}).catch(()=>{});

let homeTasks=[];
let selectingTask=false;
async function refreshTasks(){
  try{
    homeTasks=await FryTasks.available();
    document.querySelector('#task-carton').setTasks(homeTasks);
    document.querySelector('#task-count').textContent=`我的薯条盒 · ${homeTasks.length} 根`;
    document.querySelector('#task-guidance').textContent=homeTasks.length?'随手抽一根，看看这次的小任务。':'还没有任务，从下方「目标」入口开始吧。';
    document.querySelector('#task-error').textContent='';
  }catch{
    try{document.querySelector('#task-carton').setTasks([]);}catch{}
    document.querySelector('#task-count').textContent='我的薯条盒 · 0 根';
    document.querySelector('#task-guidance').textContent='暂时无法打开薯条盒。';
    document.querySelector('#task-error').textContent='请检查浏览器存储权限后刷新重试，已保存的任务不会被清除。';
  }
}
document.querySelector('#task-carton').addEventListener('task-draw',async()=>{
  if(selectingTask)return;
  selectingTask=true;
  try{
    if(!homeTasks.length)throw Error('No tasks');
    const task=homeTasks[Math.floor(Math.random()*homeTasks.length)];
    localStorage.setItem('fryplan-start-goal',JSON.stringify({taskId:task.id,goal:task.title}));
    location.href='pages/select-fries.html';
  }
  catch{document.querySelector('#task-error').textContent='未能打开这根薯条，请刷新后重试。';selectingTask=false;}
});
window.addEventListener('pageshow',()=>{selectingTask=false;refreshTasks();});
window.addEventListener('storage',refreshTasks);
refreshTasks();
