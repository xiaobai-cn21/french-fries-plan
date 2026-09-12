/* Save exactly one screenshot per sequential step, atomically in the existing DB. */
window.FryStepProof = {
  async save(task,session,file,verification=null){
    const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open('fryplan-evidence',1);
      req.onupgradeneeded=()=>req.result.createObjectStore('records',{keyPath:'id'});
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');
      let saved,failure;
      const req=store.get(task.id);
      req.onsuccess=()=>{
        const previous=req.result;
        const proofs=previous?.stepProofs||[];
        if(previous?.status==='completed'||session.stepIndex<proofs.length){saved=previous;return;}
        if(!Number.isInteger(session.stepIndex)||session.stepIndex!==proofs.length||!task.steps[session.stepIndex]){failure=Error('请先完成前一步并上传截图。');tx.abort();return;}
        const step=task.steps[session.stepIndex],now=new Date().toISOString();
        proofs.push({index:session.stepIndex,title:step.title,createdAt:now,evidence:file,duration:Math.max(0,step.minutes*60000-session.remaining),...(verification?{verification}: {})});
        const completed=proofs.length===task.steps.length;
        saved={id:task.id,taskId:task.id,goal:task.title,createdAt:previous?.createdAt||now,status:completed?'completed':'in_progress',reward:completed?3:0,evidence:file,stepProofs:proofs,stepCount:task.steps.length,duration:proofs.reduce((total,proof)=>total+proof.duration,0),...(completed?{completedAt:now}: {})};
        store.put(saved);
      };
      tx.oncomplete=()=>{db.close();resolve(saved);};tx.onerror=()=>{db.close();reject(failure||tx.error);};tx.onabort=()=>{db.close();reject(failure||tx.error);};
    });
  }
};
