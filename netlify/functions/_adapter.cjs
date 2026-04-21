// Netlify Functions v1 adapter: 将 Lambda event 转为 Vercel Express-style (req, res)
function adapt(vercelHandler) {
  return async (event, context) => {
    // event.body 是 JSON 字符串（API Gateway）
    let body = {};
    if (event.body) {
      try { body = JSON.parse(event.body); } catch {}
    }

    const req = {
      method: event.httpMethod || 'GET',
      headers: event.headers || {},
      body,
      query: event.queryStringParameters || {},
      url: event.path || '/',
    };

    let statusCode = 200;
    let responseBody = {};

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

    return {
      statusCode,
      body: JSON.stringify(responseBody),
      headers: { 'Content-Type': 'application/json' },
    };
  };
}

module.exports = { adapt };
