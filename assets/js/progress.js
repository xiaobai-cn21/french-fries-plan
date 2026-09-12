/* Shared, locally recorded progress. Completion is confirmed by the user. */
window.FryProgress = (() => {
  function dayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function summarize(items) {
    const completed = items.filter(item => item.status === 'completed');
    const days = new Set(completed.map(item => dayKey(new Date(item.completedAt || item.createdAt))));
    const cursor = new Date();
    cursor.setHours(12,0,0,0);
    if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate()-1);
    let streak = 0;
    while (days.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate()-1); }
    return {count:completed.length, energy:completed.reduce((total,item)=>total+(Number.isFinite(item.reward)?item.reward:3),0), streak, days};
  }
  function read() {
    return new Promise((resolve,reject) => {
      const request = indexedDB.open('fryplan-evidence',1);
      request.onupgradeneeded = () => request.result.createObjectStore('records',{keyPath:'id'});
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('records');
        const query = tx.objectStore('records').getAll();
        query.onsuccess = () => resolve(query.result);
        query.onerror = () => reject(query.error);
        tx.oncomplete = () => db.close();
      };
    });
  }
  return {read,summarize,dayKey};
})();
