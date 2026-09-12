window.FryPlanApi = (() => {
  const base = () => (window.FRYPLAN_API_BASE || localStorage.getItem('fryplan-api-base') || 'http://127.0.0.1:3001').replace(/\/$/, '');

  async function post(path, body) {
    const response = await fetch(`${base()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) throw Error(data.error || 'API request failed');
    return data;
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
    estimateTime: goal => post('/api/estimate-time', { goal }),
    startFries: goal => post('/api/start-fries', { goal }),
    async verifyPhoto(goal, file) {
      return post('/api/verify-photo', { goal, image: await fileToDataURL(file) });
    }
  };
})();
