import { serve } from 'wasmer/winterjs';

async function handleRequest(req) {
  const url = new URL(req.url);
  let path = url.pathname;

  if (path === '/' || path === '') {
    path = '/index.html';
  }

  try {
    // 尝试读取文件，注意文件路径
    const filePath = `/public${path}`;
    const fileContent = await Deno.readFile(filePath);
    
    let contentType = 'text/plain';
    if (path.endsWith('.html')) contentType = 'text/html; charset=utf-8';
    else if (path.endsWith('.css')) contentType = 'text/css';
    else if (path.endsWith('.js')) contentType = 'application/javascript';
    else if (path.endsWith('.png')) contentType = 'image/png';
    else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (path.endsWith('.svg')) contentType = 'image/svg+xml';
    else if (path.endsWith('.woff') || path.endsWith('.woff2')) contentType = 'font/woff2';

    return new Response(fileContent, {
      status: 200,
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    // 如果是 404，返回一个简单的 HTML 错误页面，而不是纯文本，有时这能避免 500
    return new Response(`<h1>404 Not Found</h1><p>Cannot find ${path}</p>`, { 
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

serve(handleRequest);