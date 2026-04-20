addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  let path = url.pathname;

  if (path === '/' || path === '') {
    path = '/index.html';
  }

  try {
    const filePath = `/public${path}`;
    
    // WinterJS 读取文件
    const file = await fetch(`file://${filePath}`);
    
    if (!file.ok) {
      return new Response(`Not Found: ${path}`, { status: 404 });
    }

    let contentType = 'text/plain';
    if (path.endsWith('.html')) contentType = 'text/html; charset=utf-8';
    else if (path.endsWith('.css')) contentType = 'text/css';
    else if (path.endsWith('.js')) contentType = 'application/javascript';
    else if (path.endsWith('.png')) contentType = 'image/png';
    else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (path.endsWith('.svg')) contentType = 'image/svg+xml';
    else if (path.endsWith('.woff') || path.endsWith('.woff2')) contentType = 'font/woff2';

    return new Response(file.body, {
      status: 200,
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    return new Response(`Server Error: ${error.message}`, { status: 500 });
  }
}