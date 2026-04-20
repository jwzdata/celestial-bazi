import { serve } from 'wasmer/winterjs';

const headers = {
  'Content-Type': 'text/html; charset=utf-8',
};

async function handleRequest(req) {
  const url = new URL(req.url);
  let path = url.pathname;

  if (path === '/' || path === '') {
    path = '/index.html';
  }

  try {
    const fileContent = await Deno.readFile(`/public${path}`);
    let contentType = 'text/plain';
    
    if (path.endsWith('.html')) contentType = 'text/html; charset=utf-8';
    else if (path.endsWith('.css')) contentType = 'text/css';
    else if (path.endsWith('.js')) contentType = 'application/javascript';
    else if (path.endsWith('.png')) contentType = 'image/png';
    else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (path.endsWith('.svg')) contentType = 'image/svg+xml';
    else if (path.endsWith('.woff') || path.endsWith('.woff2')) contentType = 'font/woff2';

    return new Response(fileContent, {
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    if (path === '/index.html') {
        return new Response('Error loading index.html: ' + error.message, { status: 500 });
    }
    return new Response('404 Not Found: ' + path, { status: 404 });
  }
}

serve(handleRequest);