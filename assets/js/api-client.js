window.FryPlanApi = (() => {
  const DEFAULT_LOCAL_API = 'http://127.0.0.1:3001';

  const backendBase = () => (
    window.FRYPLAN_API_BASE ||
    localStorage.getItem('fryplan-api-base') ||
    DEFAULT_LOCAL_API
  ).replace(/\/$/, '');

  async function post(path, body) {
    const response = await fetch(`${backendBase()}${path}`, {
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
    estimateTime(goal) {
      return post('/api/estimate-time', { goal });
    },
    startFries(goal) {
      return post('/api/start-fries', { goal });
    },
    async verifyPhoto(goal, file) {
      return post('/api/verify-photo', { goal, image: await fileToDataURL(file) });
    }
  };
})();
