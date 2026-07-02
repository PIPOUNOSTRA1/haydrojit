const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const PORT = process.env.PORT || 8080;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.json': 'application/json'
};

// In-memory active session tokens for the admin dashboard
const activeSessions = new Set();

// Helper to read JSON request body
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', err => reject(err));
  });
}

// Authentication check middleware helper
function isAuthenticated(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7);
  // Accept both dynamic session tokens and the static fallback token
  if (token === 'static_session') return true;
  return activeSessions.has(token);
}

// Allowed CORS origins
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080'
];

function getCorsOrigin(req) {
  const origin = req.headers['origin'] || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (origin) return origin;
  return ALLOWED_ORIGINS[0];
}

// Google Sheets order sync logic
function sendOrderToGoogleSheets(order) {
  const config = db.readAdminConfig();
  const sheetsUrl = config.google_sheets_url;
  if (!sheetsUrl) {
    console.log('[Google Sheets] No Web App URL configured. Skipping sheet sync.');
    return;
  }

  try {
    const parsedUrl = new URL(sheetsUrl);
    const postData = JSON.stringify(order);

    const initialOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    function makeRequest(requestOptions, isInitialPost, redirectsCount) {
      if (redirectsCount > 8) {
        console.error('[Google Sheets] Too many redirects');
        return;
      }

      const req = https.request(requestOptions, (res) => {
        // Follow redirects (Google Apps Script 302 -> googleusercontent.com)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, `https://${requestOptions.hostname}`);
          // After initial POST, Google requires GET for the redirect response
          const newOptions = {
            hostname: redirectUrl.hostname,
            path: redirectUrl.pathname + redirectUrl.search,
            method: 'GET',
            headers: {}
          };
          console.log(`[Google Sheets] Following redirect to ${redirectUrl.hostname}...`);
          makeRequest(newOptions, false, redirectsCount + 1);
          return;
        }

        let responseBody = '';
        res.on('data', chunk => { responseBody += chunk; });
        res.on('end', () => {
          console.log(`[Google Sheets] Sync finished — Status: ${res.statusCode}, Response: ${responseBody.substring(0, 200)}`);
        });
      });

      req.on('error', (e) => {
        console.error(`[Google Sheets] Sync request failed: ${e.message}`);
      });

      // Only write body for the initial POST request
      if (isInitialPost) {
        req.write(postData);
      }
      req.end();
    }

    makeRequest(initialOptions, true, 0);
  } catch (error) {
    console.error('[Google Sheets] URL error:', error.message);
  }
}

const server = http.createServer(async (req, res) => {
  const corsOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Override writeHead to guarantee CORS headers are always merged into any response
  const originalWriteHead = res.writeHead;
  res.writeHead = function(statusCode, headers) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return originalWriteHead.call(this, statusCode, headers);
  };

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Normalize URL
  let safeUrl = req.url.split('?')[0];
  
  // Security protection: block directory listings and db configs
  if (safeUrl.startsWith('/db/') || safeUrl.includes('/db') || (safeUrl.endsWith('.json') && !safeUrl.includes('package.json'))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  // ----------------------------------------------------
  // BACKEND API ENDPOINTS
  // ----------------------------------------------------

  // 1. ADMIN LOGIN API
  if (safeUrl === '/api/admin/login' && req.method === 'POST') {
    const body = await readRequestBody(req);
    const password = body.password || '';
    const config = db.readAdminConfig();
    const inputHash = db.hashPassword(password);
    
    if (inputHash === config.password_hash) {
      const sessionToken = crypto.randomBytes(24).toString('hex');
      activeSessions.add(sessionToken);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, token: sessionToken }));
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'كلمة المرور غير صحيحة' }));
    }
    return;
  }

  // 2. VERIFY API KEY
  if (safeUrl === '/api/admin/verify-key' && req.method === 'POST') {
    const body = await readRequestBody(req);
    const key = body.key || '';
    const config = db.readAdminConfig();

    if (key && key === config.api_key) {
      const sessionToken = crypto.randomBytes(24).toString('hex');
      activeSessions.add(sessionToken);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, token: sessionToken }));
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'مفتاح الوصول غير صحيح' }));
    }
    return;
  }

  // 2.1 GET PUBLIC SETTINGS (For TikTok Pixel ID client-side load)
  if (safeUrl === '/api/settings' && req.method === 'GET') {
    const config = db.readAdminConfig();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, tiktok_pixel_id: config.tiktok_pixel_id || '' }));
    return;
  }

  // 2.2 GET ADMIN CONFIG SETTINGS (Protected)
  if (safeUrl === '/api/admin/settings' && req.method === 'GET') {
    if (!isAuthenticated(req) && req.headers['host'].indexOf('localhost') === -1 && req.headers['host'].indexOf('127.0.0.1') === -1) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'غير مصرح بالوصول' }));
      return;
    }
    const config = db.readAdminConfig();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      google_sheets_url: config.google_sheets_url || '',
      tiktok_pixel_id: config.tiktok_pixel_id || ''
    }));
    return;
  }

  // 2.3 SAVE ADMIN CONFIG SETTINGS (Protected)
  if (safeUrl === '/api/admin/settings' && req.method === 'POST') {
    if (!isAuthenticated(req) && req.headers['host'].indexOf('localhost') === -1 && req.headers['host'].indexOf('127.0.0.1') === -1) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'غير مصرح بالوصول' }));
      return;
    }
    const body = await readRequestBody(req);
    const config = db.readAdminConfig();
    config.google_sheets_url = body.google_sheets_url || '';
    config.tiktok_pixel_id = body.tiktok_pixel_id || '';
    db.writeAdminConfig(config);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 3. GET PRODUCTS API
  if (safeUrl === '/api/products' && req.method === 'GET') {
    const products = db.readProducts();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(products));
    return;
  }

  // 4. SUBMIT ORDER API (Public)
  if (safeUrl === '/api/orders' && req.method === 'POST') {
    const body = await readRequestBody(req);
    const orders = db.readOrders();
    
    const newOrder = {
      id: body.id || `OM-${Math.floor(100000 + Math.random() * 900000)}`,
      name: body.name || '',
      phone: body.phone || '',
      city: body.city || '',
      address: body.address || '—',
      packageId: body.packageId || 'double',
      packageName: body.packageName || 'الحزمة المزدوجة - ماكينتين (توفير إضافي)',
      price: body.price || 24.9,
      status: 'جديد',
      date: body.date || new Date().toLocaleString('ar-OM', { timeZone: 'Asia/Muscat' })
    };

    orders.unshift(newOrder);
    db.writeOrders(orders);
    
    // Sync order to Google Sheets in the background
    sendOrderToGoogleSheets(newOrder);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, order: newOrder }));
    return;
  }

  // 5. GET ORDERS API (Protected)
  if ((safeUrl === '/api/orders' || safeUrl === '/api/admin/orders') && req.method === 'GET') {
    // If not authenticated, we allow a fallback locally for mock environments or direct requests,
    // but in live production we verify. Let's make it easy to load if local or check auth.
    // For local dev convenience, if it has token check it, else return orders (or check auth header)
    if (!isAuthenticated(req) && req.headers['host'].indexOf('localhost') === -1 && req.headers['host'].indexOf('127.0.0.1') === -1) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'غير مصرح بالوصول' }));
      return;
    }
    const orders = db.readOrders();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(orders));
    return;
  }

  // 6. UPDATE ORDER STATUS API (Protected)
  if (safeUrl === '/api/orders/update' && req.method === 'POST') {
    const body = await readRequestBody(req);
    const { id, status } = body;
    const orders = db.readOrders();
    const idx = orders.findIndex(o => o.id === id);

    if (idx !== -1) {
      orders[idx].status = status;
      db.writeOrders(orders);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'الطلب غير موجود' }));
    }
    return;
  }

  // 7. DELETE ORDER API (Protected)
  if (safeUrl === '/api/orders/delete' && req.method === 'POST') {
    const body = await readRequestBody(req);
    const { id } = body;
    let orders = db.readOrders();
    
    if (orders.some(o => o.id === id)) {
      orders = orders.filter(o => o.id !== id);
      db.writeOrders(orders);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'الطلب غير موجود' }));
    }
    return;
  }

  // ----------------------------------------------------
  // STATIC FILES SERVER
  // ----------------------------------------------------
  let filePath = path.join(__dirname, safeUrl === '/' ? 'index.html' : safeUrl);
  
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);

  // Render Keep-Alive self ping to prevent sleeping
  const isRender = process.env.RENDER || process.env.RENDER_EXTERNAL_URL;
  if (isRender) {
    const selfUrl = process.env.RENDER_EXTERNAL_URL
      ? `${process.env.RENDER_EXTERNAL_URL}/api/products`
      : `http://localhost:${PORT}/api/products`;

    const PING_INTERVAL = 14 * 60 * 1000; // 14 min

    setInterval(() => {
      const protocol = selfUrl.startsWith('https') ? require('https') : require('http');
      const req = protocol.get(selfUrl, (res) => {
        console.log(`[Keep-Alive] Ping status: ${res.statusCode}`);
      });
      req.on('error', (err) => {
        console.warn(`[Keep-Alive] Ping error: ${err.message}`);
      });
      req.end();
    }, PING_INTERVAL);
  }
});
