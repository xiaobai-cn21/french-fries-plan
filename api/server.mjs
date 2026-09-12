import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { ApiError, generatePlan } from './planner.mjs';
import { estimateTime, startFries, verifyPhoto } from './fryplan-api.mjs';

export function createApi(planner = generatePlan, handlers = {}) {
  const routes = {
    '/api/steps': planner,
    '/api/estimate-time': handlers.estimateTime || estimateTime,
    '/api/start-fries': handlers.startFries || startFries,
    '/api/verify-photo': handlers.verifyPhoto || verifyPhoto
  };
  return createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      });
      res.end(JSON.stringify(data));
    };
    try {
      const path = new URL(req.url, 'http://127.0.0.1').pathname;
      if (req.method === 'OPTIONS') return send(204, {});
      const handler = routes[path];
      if (!handler) return send(404, { error: '接口不存在。' });
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return send(405, { error: '请使用 POST 请求。' });
      }
      if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return send(415, { error: '请发送 application/json。' });
      }
      const chunks = [];
      let size = 0;
      const maxSize = path === '/api/verify-photo' ? 14_500_000 : 8192;
      // Keep the connection readable while returning a useful size error.
      for await (const chunk of req.iterator({ destroyOnReturn: false })) {
        size += chunk.length;
        if (size > maxSize) { req.resume(); throw new ApiError(413, '请求内容过长。'); }
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { throw new ApiError(400, '请求必须是有效的 JSON。'); }
      send(200, await handler(body));
    } catch (error) {
      send(error instanceof ApiError ? error.status : 500,
        { error: error instanceof ApiError ? error.message : '服务暂时不可用。' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3001);
  createApi().listen(port, '127.0.0.1', () => console.log(`FryPlan API: http://127.0.0.1:${port}`));
}
