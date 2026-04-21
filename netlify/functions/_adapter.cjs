// 通用适配器：将 Netlify Web Platform API 的 Request 转为 Vercel Express-style (req, res)
// 这样可以零改动复用 api/ 目录下的所有 Vercel Serverless Functions

function adapt(vercelHandler) {
  return async (request, context) => {
    let body = {};
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        body = typeof request.json === 'function' ? await request.json() : (request.body || {});
      } catch {}
    }

    // 构造 Express-style req
    const rawUrl = request.url || '';
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `https://placeholder${rawUrl}`;
    const req = {
      method: request.method,
      headers: request.headers instanceof Headers
        ? Object.fromEntries(request.headers.entries())
        : (request.headers || {}),
      body,
      query: Object.fromEntries(new URL(fullUrl).searchParams),
      url: rawUrl,
    };

    let statusCode = 200;
    let responseBody = {};

    // 构造 Express-style res
    const res = {
      status(code) {
        statusCode = code;
        return res;
      },
      json(data) {
        responseBody = data;
      },
      setHeader() { return res; },
      end() {},
      send(data) {
        responseBody = data;
      },
    };

    try {
      await vercelHandler(req, res);
    } catch (err) {
      console.error('Handler error:', err);
      statusCode = 500;
      responseBody = { error: 'Internal server error' };
    }

    return new Response(JSON.stringify(responseBody), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

module.exports = { adapt };
