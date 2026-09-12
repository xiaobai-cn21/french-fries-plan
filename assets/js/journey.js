const pageName = document.body.dataset.page;
const main = document.querySelector('main');
const paths = {
  back:'M19 12H5m6-7-7 7 7 7', arrow:'M4 12h15m-6-6 6 6-6 6',
  image:'M4 3h16v18H4ZM4 16l5-5 4 4 3-3 4 4M15 7h.01',
  record:'M6 3h12v18H6ZM9 8h6m-6 4h6m-6 4h3',
  chart:'M4 20V9h4v11m4 0V4h4v16m4 0V1',
  goal:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 4h.01',
  bell:'M5 17h14l-2-4V9a5 5 0 0 0-10 0v4ZM10 21h4',
  theme:'M12 3C0 3 0 20 10 21c4 1 0-6 4-6h4c8-1 4-12-6-12ZM7 9h.01M11 6h.01M16 7h.01M19 11h.01',
  info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 7v7m0-10h.01',
  settings:'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'
};
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]}"/></svg>`;}
const headerMarkup = (href='../index.html',settings=false)=>`<header class="top"><a class="back" href="${href}" aria-label="返回">${icon('back')}</a>${settings?`<button class="settings" data-menu="settings" aria-label="个人设置">${icon('settings')}</button>`:''}</header>`;
const quote = text=>`<blockquote class="quote"><span>“</span><p>${text}</p></blockquote>`;
const stats = (decorated=false)=>`<section class="stats" aria-label="行动统计"><div><strong>${decorated?'<span>🔥</span>':''}0</strong><small>连续天数</small></div><div><strong>${decorated?'<span>🍟</span>':''}0</strong><small>已完成${decorated?'薯条':''}</small></div><div><strong>${decorated?'<span>⭐</span>':''}0</strong><small>总能量</small></div></section>`;
function getLocal(key,fallback=''){try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
function setLocal(key,value){localStorage.setItem(key,value);}
if(getLocal('fryplan-theme')==='light')document.body.classList.add('light');
let dbPromise;
function database(){
  if(!dbPromise) dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open('fryplan-evidence',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('records',{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  return dbPromise;
}
async function saveRecord(record){
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('records','readwrite');
    const store=tx.objectStore('records');
    const existing=store.get(record.id);
    existing.onsuccess=()=>{
      if(existing.result?.status==='completed'){
        record.createdAt=existing.result.createdAt;
        record.completedAt=existing.result.completedAt || existing.result.createdAt;
        record.reward=existing.result.reward || 3;
      }
      store.put(record);
    };
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
async function records(){const db=await database();return new Promise((resolve,reject)=>{const req=db.transaction('records').objectStore('records').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}

if(pageName==='upload'){
  main.innerHTML=`${headerMarkup('focus.html')}<h1>完成了吗？<br>上传一张截图来记录吧！</h1><p class="subtle">每一次完成，都值得被看见。<br>上传截图并确认完成，即可获得 3 点能量。</p><form id="upload-form"><label class="upload-box" id="drop-zone"><input type="file" id="evidence" accept="image/jpeg,image/png" aria-label="选择成果截图，JPG 或 PNG"><span class="upload-icon">${icon('image')}</span><img id="preview" alt="所选成果截图预览"><strong>点击上传截图</strong><small id="file-label">支持图片格式（JPG / PNG）</small></label><aside class="hint"><strong>💡 小提示</strong><p>可以是文档截图、任务清单、<br>或任何能证明你完成的内容～</p></aside><button class="primary" id="submit-proof">确认完成</button><p class="status" id="upload-status" role="status"></p></form>`;
  let file=null,url=null,selection=0,submitting=false;
  let uploadSession={},uploadTask;
  try{uploadSession=JSON.parse(getLocal('fryplan-focus','{}'));uploadTask=FryTasks.get(uploadSession.taskId);}catch{}
  if(uploadTask?.steps){
    const step=uploadTask.steps[uploadSession.stepIndex];
    if(step){
      main.querySelector('h1').textContent='做好这一步了吗？';
      main.querySelector('.subtle').textContent='上传这一步的截图，记录你的小小进展。';
      const banner=document.createElement('div');banner.className='step-banner';
      banner.append(document.createTextNode(`第 ${uploadSession.stepIndex+1} / ${uploadTask.steps.length} 步 · ${step.minutes} 分钟`));
      const title=document.createElement('strong');title.textContent=step.title;banner.append(title);
      document.querySelector('#upload-form').before(banner);
      document.querySelector('#submit-proof').textContent=uploadSession.stepIndex<uploadTask.steps.length-1?'保存截图，开始下一步':'保存截图，完成这根薯条';
    }
  }
  const submitLabel=document.querySelector('#submit-proof').textContent;
  const status=document.querySelector('#upload-status'),zone=document.querySelector('#drop-zone');
  async function selectFile(candidate){
    const token=++selection;
    file=null;zone.classList.remove('has-image');if(url){URL.revokeObjectURL(url);url=null;}
    document.querySelector('#preview').removeAttribute('src');
    document.querySelector('#file-label').textContent='支持图片格式（JPG / PNG）';
    if(!candidate)return;
    if(!['image/jpeg','image/png'].includes(candidate.type)){status.textContent='请选择 JPG 或 PNG 图片。';return;}
    if(candidate.size>10*1024*1024){status.textContent='图片较大，请选择 10 MB 以内的截图。';return;}
    const candidateURL=URL.createObjectURL(candidate);
    const probe=new Image();probe.src=candidateURL;
    try{await probe.decode();}catch{URL.revokeObjectURL(candidateURL);if(token===selection)status.textContent='这张图片无法读取，请重新选择。';return;}
    if(token!==selection){URL.revokeObjectURL(candidateURL);return;}
    file=candidate;url=candidateURL;document.querySelector('#preview').src=url;zone.classList.add('has-image');document.querySelector('#file-label').textContent='已选截图 · 点击更换';status.textContent='';
  }
  document.querySelector('#evidence').addEventListener('change',e=>selectFile(e.target.files[0]));
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragging');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('dragging'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragging');selectFile(e.dataTransfer.files[0]);});
  document.querySelector('#upload-form').addEventListener('submit',async e=>{
    e.preventDefault();if(submitting)return;if(!file){status.textContent='先选择一张成果截图吧。';return;}
    submitting=true;const submit=document.querySelector('#submit-proof');submit.disabled=true;submit.form.setAttribute('aria-busy','true');submit.innerHTML='<span class="ai-spinner" aria-hidden="true"></span><span>AI 正在分析图片…</span>';
    try{
      const verifyGoal = uploadTask?.steps ? uploadTask.steps[uploadSession.stepIndex]?.title : (uploadSession.stepTitle || uploadSession.goal || getLocal('fryplan-goal','我的行动记录'));
      const verification = await FryPlanApi.verifyPhoto(verifyGoal,file);
      if(!verification.passed){
        status.textContent = verification.message || `图片匹配度 ${verification.score} 分，请上传更能证明任务完成的截图。`;
        submitting=false;submit.disabled=false;submit.form.removeAttribute('aria-busy');submit.textContent=submitLabel;return;
      }
      submit.innerHTML='<span class="ai-spinner" aria-hidden="true"></span><span>正在保存结果…</span>';
      if(uploadTask?.steps){
        const saved=await FryStepProof.save(uploadTask,uploadSession,file,verification);
        if(saved.status==='completed'){location.href=`success.html?record=${encodeURIComponent(saved.id)}`;return;}
        await FryTasks.select(uploadTask.id);location.href='focus.html';return;
      }
      const focus=uploadSession;
      const now=new Date().toISOString();
      const totalDuration=Math.max(60000,Number(focus.duration)||Number(focus.totalMinutes)*60000||900000);
      const spentDuration=Math.max(0,Math.min(totalDuration,Number.isFinite(focus.remaining)?totalDuration-focus.remaining:Number(focus.miniMinutes)*60000||0));
      const rawPercent=Math.max(0,Math.min(100,Math.round(spentDuration/totalDuration*100)));
      const stagePercent=rawPercent>=100?100:rawPercent>=75?75:rawPercent>=50?50:25;
      const complete=rawPercent>=100;
      const record={
        id:focus.taskId||focus.id||crypto.randomUUID(),
        taskId:focus.taskId||focus.id,
        goal:focus.goal||focus.miniGoal||getLocal('fryplan-goal','我的行动记录'),
        bigGoal:focus.parentGoal||getLocal('fryplan-goal','我的大目标'),
        miniGoal:focus.miniGoal||focus.goal||'',
        createdAt:now,
        status:complete?'completed':'in_progress',
        reward:complete?5:0,
        evidence:file,
        duration:spentDuration,
        totalDuration,
        progressPercent:rawPercent,
        stagePercent,
        verification,
        ...(complete?{completedAt:now}: {})
      };
      await saveRecord(record);location.href=`success.html?record=${encodeURIComponent(record.id)}`;
    }catch{status.textContent='暂时无法校验图片，请确认 API 服务正在运行后重试。';submitting=false;submit.disabled=false;submit.form.removeAttribute('aria-busy');submit.textContent=submitLabel;}
  });
  window.addEventListener('pagehide',()=>{if(url)URL.revokeObjectURL(url);});
}

if(pageName==='success'){
  const demo=new URLSearchParams(location.search).get('demo')==='1';
  const params=new URLSearchParams(location.search);
  const noteText={
    25:'今天完成了什么？有什么收获或想法？（写几句话吧～）',
    50:'这次做了什么？遇到什么问题？下次想怎么做？',
    75:'今天的进展如何？有什么新的想法？需要调整什么？',
    100:'完成了一根薯条！你正在一步步接近大目标！'
  };
  function stageFor(item){
    const stored=Number(item?.stagePercent);
    if([25,50,75,100].includes(stored))return stored;
    const percent=Number(item?.progressPercent)||0;
    if(percent>=100||item?.status==='completed')return 100;
    if(percent>=75)return 75;
    if(percent>=50)return 50;
    return 25;
  }
  function render(item={}){
    const stage=stageFor(item);
    const complete=stage===100;
    const percent=Math.max(0,Math.min(100,Math.round(Number(item.progressPercent)||stage)));
    main.classList.add('success','progress-result',`stage-${stage}`);
    const heading=complete?'太棒了！<br>这根薯条完成啦！':`本次完成 <span>${stage}%</span>`;
    main.innerHTML=`${headerMarkup('upload.html')}${demo?'<span class="demo-badge">效果预览 · 示例数据，不计入成果</span>':''}<section class="result-card" aria-labelledby="result-title"><h1 id="result-title">${heading}</h1><img class="result-art" src="../assets/images/success/${stage}.png" alt="" aria-hidden="true"><div class="progress-row"><div class="result-bar" role="progressbar" aria-label="本次完成进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stage}"><span style="width:${stage}%"></span></div><strong>${stage}%</strong></div>${complete?`<div class="energy-card"><span>获得能量</span><strong>+${item.reward||5} <b>⚡</b></strong></div><p class="done-copy">又完成了一根薯条！<br>你正在一步步接近大目标！</p>`:`<label class="reflection"><span>记录一下吧 <b>🖊️</b></span><textarea id="reflection-note" maxlength="100" placeholder="${noteText[stage]}"></textarea><small>0/100</small></label>`}<a class="primary" id="continue-result" href="${complete?'goal.html':'../index.html'}">${complete?'继续下一根薯条':'保存并继续'} ${icon('arrow')}</a></section>`;
    const textarea=document.querySelector('#reflection-note');
    if(textarea){
      const small=textarea.parentElement.querySelector('small');
      textarea.addEventListener('input',()=>{small.textContent=`${textarea.value.length}/100`;localStorage.setItem(`fryplan-result-note-${item.id||'demo'}`,textarea.value);});
    }
  }
  if(demo){
    const previewStage=[25,50,75,100].includes(Number(params.get('stage')))?Number(params.get('stage')):25;
    render({id:'demo',stagePercent:previewStage,progressPercent:previewStage,duration:previewStage*12000,totalDuration:20*60000,status:previewStage===100?'completed':'in_progress',reward:5});
  }
  else{
    records().then(items=>{
      const id=params.get('record');const item=items.find(r=>r.id===id);
      if(item)render(item);else{main.classList.add('success','progress-result');main.innerHTML=`${headerMarkup('upload.html')}<h1 id="result-title">还没有提交成果</h1><p class="status">先上传一张截图，记录这次小小的行动吧。</p><a class="primary" href="upload.html">去上传截图 ${icon('arrow')}</a>`;}
    }).catch(()=>{main.classList.add('success','progress-result');main.innerHTML=`${headerMarkup('upload.html')}<h1 id="result-title">暂时无法读取记录</h1><p class="status">请检查浏览器存储权限后重试。</p>`;});
  }
}
if(pageName==='companion'){
  main.classList.add('companion');
  main.innerHTML=`${headerMarkup()}<h1>我的薯条伙伴</h1><section class="companion-hero"><img class="companion-vector potato-left-art" src="../assets/images/potato-left.png" alt="" aria-hidden="true"><div class="speech">和我一起<br>把一个个小目标<br>变成大改变！</div><div class="level"><strong>Lv.1</strong><span>初次见面的小薯条伙伴</span></div></section><div class="growth-track" role="progressbar" aria-label="伙伴成长能量" aria-valuenow="0" aria-valuemin="0" aria-valuemax="50"><div><i></i></div><span>0 / 50 <b>ϟ</b></span></div>${stats(true)}${quote('不是更完美，而是更勇敢地开始。')}<section class="companion-words"><h2>伙伴寄语</h2><p>✨ 很高兴和你一起努力！<br>今天也要加油呀！<span>—— FryPlan</span></p><img class="mini-fries-vector potato-left-art" src="../assets/images/potato-left.png" alt="" aria-hidden="true"></section><a href="goal.html" class="quiet-link">一起开始今天的第一根薯条 →</a>`;
}

if(pageName==='profile'){
  main.classList.add('profile');
  main.innerHTML=`${headerMarkup('../index.html',true)}<section class="profile-header"><div class="avatar" role="img" aria-label="红盒薯条头像"></div><div><h1 id="nickname"></h1><p>今天，从第一根薯条开始</p></div></section>${stats()}<nav class="menu" aria-label="个人中心"><button data-menu="records">${icon('record')}我的薯条记录<span>›</span></button><button data-menu="stats">${icon('chart')}数据统计<span>›</span></button><a href="goal.html">${icon('goal')}我的目标<span>›</span></a><button data-menu="reminders">${icon('bell')}提醒设置<span>›</span></button><button data-menu="theme">${icon('theme')}主题外观<span>›</span></button><button data-menu="about">${icon('info')}关于我们<span>›</span></button></nav><p class="signature">更小的开始，<br>更大的改变<span>— FryPlan</span></p><dialog id="profile-dialog"><button class="close" aria-label="关闭">×</button><h2 id="dialog-title"></h2><div id="dialog-content"></div></dialog>`;
  document.querySelector('#nickname').textContent=getLocal('fryplan-name','小薯同学');
  const dialog=document.querySelector('#profile-dialog'),content=document.querySelector('#dialog-content');
  let previewURLs=[],menuVersion=0;
  function clearPreviews(){previewURLs.forEach(url=>URL.revokeObjectURL(url));previewURLs=[];}
  dialog.querySelector('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{menuVersion++;clearPreviews();});
  document.querySelectorAll('[data-menu]').forEach(button=>button.addEventListener('click',async()=>{
    const version=++menuVersion;clearPreviews();const type=button.dataset.menu;
    const titles={records:'我的薯条记录',stats:'数据统计',settings:'个人设置',reminders:'提醒设置',theme:'主题外观',about:'关于薯条计划'};
    document.querySelector('#dialog-title').textContent=titles[type];content.replaceChildren();dialog.showModal();
    if(type==='records'||type==='stats'){
      content.textContent='正在读取…';
      try{const items=await records();if(version!==menuVersion||!dialog.open)return;content.replaceChildren();
        if(type==='stats'){const p=document.createElement('p');p.textContent=`已完成 ${FryProgress.summarize(items).count} 根薯条，获得 ${FryProgress.summarize(items).energy} 点能量，连续行动 ${FryProgress.summarize(items).streak} 天。`;content.append(p);}
        else if(!items.length){content.innerHTML='<p>还没有成果记录。完成一次加热后，上传截图来记录吧。</p><a class="primary" href="upload.html">记录我的成果</a>';}
        else items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).forEach(item=>{
          const entry=document.createElement('article');entry.className='record';
          const title=document.createElement('strong');title.textContent=item.goal;
          const detail=document.createElement('small');detail.textContent=`${new Date(item.createdAt).toLocaleDateString('zh-CN')} · ${item.status==='completed'?'已完成 · +3 能量':item.stepProofs?`已完成 ${item.stepProofs.length} / ${item.stepCount} 步`:'已保存，未确认完成'}`;
          entry.append(title,detail);
          const proofs=item.stepProofs||[{evidence:item.evidence}];
          proofs.forEach(proof=>{
            const section=document.createElement('div');section.className='step-proof';
            if(proof.title){const caption=document.createElement('p');caption.textContent=`第 ${proof.index+1} 步：${proof.title}`;section.append(caption);}
            const image=document.createElement('img'),url=URL.createObjectURL(proof.evidence);previewURLs.push(url);image.src=url;image.alt=proof.title||'保存的成果截图';section.append(image);entry.append(section);
          });content.append(entry);
        });
      }catch{if(version===menuVersion)content.textContent='无法读取本地记录，请检查浏览器存储权限。';}
    }else if(type==='settings'){
      content.innerHTML='<form id="name-form"><label for="name">你的昵称</label><input id="name" maxlength="20" required><button class="primary">保存昵称</button><p role="status" id="name-status"></p></form>';
      const name=content.querySelector('#name');name.value=getLocal('fryplan-name','小薯同学');
      content.querySelector('form').addEventListener('submit',e=>{e.preventDefault();if(!name.value.trim())return;try{setLocal('fryplan-name',name.value.trim());document.querySelector('#nickname').textContent=name.value.trim();dialog.close();}catch{content.querySelector('#name-status').textContent='昵称未能保存，请检查浏览器存储权限。';}});
    }else if(type==='theme'){
      content.innerHTML='<p>切换这些新页面的背景外观。</p><button class="primary" id="toggle-theme">切换奶油色 / 纯白色</button><p id="theme-status" role="status"></p>';
      content.querySelector('button').addEventListener('click',()=>{document.body.classList.toggle('light');try{setLocal('fryplan-theme',document.body.classList.contains('light')?'light':'cream');}catch{content.querySelector('#theme-status').textContent='已切换当前页面，但无法保存偏好。';}});
    }else if(type==='reminders'){content.innerHTML='<p>暂未开启定时提醒。你可以随时回来，按照自己的节奏开始一根薯条。</p>';}
    else{content.innerHTML='<p>🍟 薯条计划 FryPlan</p><p>从一个小行动开始，把生活重新加热。</p><p>这是本地网页版本。直接创建任务，完成后上传截图并确认，每根薯条获得 3 点能量。任务和截图保存在当前浏览器中。</p>';}
  }));
}

if(pageName==='profile'||pageName==='companion'){
  records().then(items=>{
    const summary=FryProgress.summarize(items);
    const values=[summary.streak,summary.count,summary.energy];
    document.querySelectorAll('.stats strong').forEach((element,index)=>{
      const decoration=element.querySelector('span');
      element.replaceChildren(...(decoration?[decoration]:[]),document.createTextNode(String(values[index])));
    });
    if(pageName==='companion'){
      const level=Math.min(4,1+Math.floor(summary.energy/50));
      const growth=level===4?50:summary.energy%50;
      document.querySelector('.level strong').textContent=`Lv.${level}`;
      document.querySelector('.level span').textContent=['小薯条','脆皮薯条','黄金薯条','薯条大师'][level-1];
      document.querySelector('.growth-track').setAttribute('aria-valuenow',growth);
      document.querySelector('.growth-track i').style.width=`${growth/50*100}%`;
      document.querySelector('.growth-track>span').textContent=`${growth} / 50 ϟ`;
    }
  }).catch(()=>{
    const status=document.createElement('p');status.className='status';status.textContent='暂时无法读取行动统计，请稍后重试。';main.append(status);
  });
}

