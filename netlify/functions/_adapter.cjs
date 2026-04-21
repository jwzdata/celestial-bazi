// 通用适配器：将 Netlify Web Platform API 的 Request 转为 Vercel Express-style (req, res)
// 这样可以零改动复用 api/ 目录下的所有 Vercel Serverless Functions

/**
 * @param {Function} vercelHandler - Vercel-style handler: (req, res) => Promise<void>
 * @returns {Function} Netlify-style handler: (req: Request, context: Context) => Promise<Response>
 */
function adapt(vercelHandler) {
  return async (request, context) => {
    let body = {};
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try { body = await request.json(); } catch {}
    }

    // 构造 Express-style req
    const req = {
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      query: Object.fromEntries(new URL(request.url).searchParams),
      // 兼容一些写法
      url: request.url,
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

    await vercelHandler(req, res);

    return new Response(JSON.stringify(responseBody), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

module.exports = { adapt };
