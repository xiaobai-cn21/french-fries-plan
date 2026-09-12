/* Task collection and per-task timer snapshots. Completion records are authoritative. */
window.FryTasks = (() => {
  const KEY='fryplan-tasks-v1';
  function load(){
    const raw=localStorage.getItem(KEY);
    if(raw===null){
      const old=JSON.parse(localStorage.getItem('fryplan-focus')||'null');
      const tasks=old?.id && typeof old.goal==='string' && old.goal.trim()
        ? [{id:old.taskId||old.id,title:old.goal,createdAt:new Date().toISOString(),session:{...old,taskId:old.taskId||old.id}}] : [];
      save(tasks);return tasks;
    }
    const tasks=JSON.parse(raw);
    if(!Array.isArray(tasks))throw Error('Invalid task storage');
    const valid = tasks
      .filter(task=>task?.id && typeof task.title==='string' && task.title.trim())
      .sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
    if(valid.length!==tasks.length)save(valid);
    return valid;
  }
  function save(tasks){localStorage.setItem(KEY,JSON.stringify(tasks));}
  async function available(){
    const tasks=load();
    const records=await FryProgress.read();
    const completed=new Set(records.filter(item=>item.status==='completed').map(item=>item.taskId||item.id));
    return tasks.filter(task=>!completed.has(task.id)).map(task=>({...task,stepIndex:records.find(record=>(record.taskId||record.id)===task.id)?.stepProofs?.length||0}));
  }
  function create(title,stepsOrOptions=null){
    const value=title.trim();if(!value||value.length>50)throw Error('Invalid task');
    const steps=Array.isArray(stepsOrOptions)?stepsOrOptions:stepsOrOptions?.steps||null;
    const estimateMinutes=Number(stepsOrOptions?.estimateMinutes);
    if(steps && (!Array.isArray(steps)||!steps.length||steps.some(step=>!step.title?.trim()||step.title.length>80||![1,3].includes(step.minutes))))throw Error('Invalid steps');
    if(Number.isFinite(estimateMinutes) && (!Number.isInteger(estimateMinutes)||estimateMinutes<1||estimateMinutes>1440))throw Error('Invalid estimate');
    const task={id:crypto.randomUUID(),title:value,createdAt:new Date().toISOString(),session:null,...(steps?{steps}: {}),...(Number.isFinite(estimateMinutes)?{estimateMinutes}: {})};
    const tasks=load();
    save([task,...tasks]);return task;
  }
  function snapshot(session){
    if(!session?.taskId)return;
    const tasks=load(),task=tasks.find(item=>item.id===session.taskId);
    if(task){task.session={...session};save(tasks);}
  }
  async function select(id){
    const task=(await available()).find(item=>item.id===id);
    if(!task)throw Error('Task unavailable');
    const previous=JSON.parse(localStorage.getItem('fryplan-focus')||'null');
    if(previous?.taskId){
      if(previous.state==='running'){
        previous.remaining=Math.max(0,previous.deadline-Date.now());
        previous.state=previous.remaining===0?'ended':'paused';
      }
      snapshot(previous);
    }
    const current=load().find(item=>item.id===id);
    const stepIndex=task.steps?task.stepIndex:0;
    const duration=(task.steps?task.steps[stepIndex].minutes:(Number.isInteger(task.estimateMinutes)?task.estimateMinutes:15))*60000;
    const session=current.session && (!task.steps || current.session.stepIndex===stepIndex) ? {...current.session} : {id:task.id,remaining:duration};
    Object.assign(session,{taskId:task.id,goal:task.title,duration,stepIndex,stepCount:task.steps?.length||0,stepTitle:task.steps?.[stepIndex].title||''});
    session.remaining=Math.max(0,Math.min(duration,Number(session.remaining)||0));
    session.state=session.remaining===0?'ended':'running';
    session.deadline=Date.now()+session.remaining;
    snapshot(session);
    localStorage.setItem('fryplan-focus',JSON.stringify(session));
    return session;
  }
  async function startFry(id,fry){
    const session=await select(id);
    const task=load().find(item=>item.id===id);
    const totalMinutes=Number.isInteger(task?.estimateMinutes) ? task.estimateMinutes : Math.max(1,Math.min(1440,Math.round(Number(session.duration)/60000)||15));
    const miniMinutes=Math.max(1,Math.min(1440,Math.round(Number(String(fry.time).match(/\d+/)?.[0]||fry.minutes||15))));
    const duration=totalMinutes*60000;
    Object.assign(session,{parentGoal:task?.title||session.goal,goal:fry.title,miniGoal:fry.title,miniMinutes,totalMinutes,duration,remaining:duration,state:'running',deadline:Date.now()+duration,stepTitle:''});
    snapshot(session);
    localStorage.setItem('fryplan-focus',JSON.stringify(session));
    return session;
  }
  async function draw(){
    const tasks=await available();
    if(!tasks.length)throw Error('No unfinished tasks');
    // Rejection sampling gives every unfinished task an equal chance, across all trays.
    const limit=Math.floor(4294967296/tasks.length)*tasks.length;
    const random=new Uint32Array(1);
    do{crypto.getRandomValues(random);}while(random[0]>=limit);
    return select(tasks[random[0]%tasks.length].id);
  }
  return {available,create,snapshot,select,startFry,draw,get:id=>load().find(task=>task.id===id)};
})();
