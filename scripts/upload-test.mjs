/**
 * Test script for POST /api/v1/upload
 *
 * Set LOGIN_EMAIL + LOGIN_PASSWORD in .env (project root), then: npm run upload-test
 * Or: set UPLOAD_TEST_TOKEN=your_jwt && npm run upload-test
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(__dirname);
dotenv.config({ path: path.join(rootDir, '.env') });

import fs from 'fs';

const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const testPngPath = path.join(rootDir, 'test-upload.png');

if (!fs.existsSync(testPngPath)) {
  fs.writeFileSync(testPngPath, Buffer.from(base64Png, 'base64'));
  console.log('Created test-upload.png');
}

const baseUrl = process.env.API_URL || 'http://localhost:5000';

async function login() {
  const email = process.env.LOGIN_EMAIL;
  const password = process.env.LOGIN_PASSWORD;
  if (!email || !password) return null;
  const res = await fetch(baseUrl + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  // Prefer token in body (added for script clients), else parse from Set-Cookie
  if (data.accessToken) return data.accessToken;
  if (!data.user) return null;
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
  const accessCookie = setCookies.find((c) => c.startsWith('accessToken='));
  if (!accessCookie) return null;
  return accessCookie.split(';')[0].replace('accessToken=', '').trim();
}

async function upload(token) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(testPngPath)], { type: 'image/png' }), 'test-upload.png');
  form.append('folder', 'test');

  const res = await fetch(baseUrl + '/api/v1/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  console.log('Status:', res.status, res.statusText);
  console.log('Response:', JSON.stringify(data, null, 2));
  return res.ok;
}

async function main() {
  let token = process.env.UPLOAD_TEST_TOKEN || process.env.ACCESS_TOKEN;
  if (!token && process.env.LOGIN_EMAIL && process.env.LOGIN_PASSWORD) {
    console.log('Logging in...');
    token = await login();
    if (token) console.log('Got token.');
  }
  if (!token) {
    console.log('POST', baseUrl + '/api/v1/upload (no token - expect 401)');
  }
  const ok = await upload(token);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

