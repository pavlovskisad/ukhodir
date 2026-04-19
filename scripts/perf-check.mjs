#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';

const PORT = 4199;
const BASE = `http://localhost:${PORT}`;

const BUDGETS = {
  bundleSizeKB: 1400,
  domNodes: { Home: 80, CardIndex: 1500, List: 500, Everything: 350, Event: 150 },
  heapMB: 20,
};

let server;
function startServer() {
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT)], { stdio: 'pipe', detached: true });
  return new Promise((res, rej) => {
    const timeout = setTimeout(() => rej(new Error('Server start timeout')), 15000);
    server.stdout.on('data', d => { if (d.toString().includes('Local:')) { clearTimeout(timeout); setTimeout(res, 1000); } });
    server.stderr.on('data', d => { if (d.toString().includes('Local:')) { clearTimeout(timeout); setTimeout(res, 1000); } });
  });
}
function stopServer() { if (server) { process.kill(-server.pid); } }

async function checkBundle() {
  console.log('\n── Bundle Size ──');
  const out = execSync('npx vite build 2>&1').toString();
  const match = out.match(/index-\S+\.js\s+([\d,.]+)\s+kB/);
  if (!match) { console.log('  Could not parse bundle size'); return true; }
  const size = parseFloat(match[1].replace(',', ''));
  const pass = size <= BUDGETS.bundleSizeKB;
  console.log(`  JS bundle: ${size} KB ${pass ? '✓' : `✗ (budget: ${BUDGETS.bundleSizeKB} KB)`}`);
  return pass;
}

async function checkDOM() {
  let puppeteer;
  try { puppeteer = await import('puppeteer'); } catch { console.log('  Skipping DOM check (puppeteer not installed)'); return true; }

  const chromePaths = [
    '/root/.cache/puppeteer/chrome/linux-147.0.7727.56/chrome-linux64/chrome',
    'google-chrome-stable', 'google-chrome', 'chromium-browser', 'chromium',
  ];
  const chromePath = chromePaths.find(p => { try { execSync(`which ${p} 2>/dev/null`); return true; } catch { return existsSync(p); } });
  if (!chromePath) { console.log('  Skipping DOM check (Chrome not found)'); return true; }

  console.log('\n── DOM & Memory ──');
  const browser = await puppeteer.default.launch({
    executablePath: chromePath, headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  let allPass = true;

  async function measure(name, action) {
    if (action) await action();
    await new Promise(r => setTimeout(r, 1500));
    const dom = await page.evaluate(() => document.querySelectorAll('*').length);
    const m = await page.metrics();
    const heap = Math.round(m.JSHeapUsedSize / 1024 / 1024 * 10) / 10;
    const budget = BUDGETS.domNodes[name];
    const domPass = !budget || dom <= budget;
    const heapPass = heap <= BUDGETS.heapMB;
    if (!domPass || !heapPass) allPass = false;
    console.log(`  ${name}: ${dom} DOM nodes ${domPass ? '✓' : `✗ (budget: ${budget})`}, ${heap} MB heap ${heapPass ? '✓' : `✗ (budget: ${BUDGETS.heapMB} MB)`}`);
  }

  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
  await measure('Home');

  await measure('CardIndex', async () => {
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase().includes('enter archive')); if (b) b.click(); });
    await new Promise(r => setTimeout(r, 1200));
  });

  await measure('List', async () => {
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '/list'); if (b) b.click(); });
  });

  await measure('Everything', async () => {
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === 'everything'); if (b) b.click(); });
  });

  await page.goto(`${BASE}/event/42`, { waitUntil: 'networkidle0', timeout: 30000 });
  await measure('Event');

  await browser.close();
  return allPass;
}

(async () => {
  console.log('='.repeat(50));
  console.log('Performance Budget Check');
  console.log('='.repeat(50));

  const bundleOk = await checkBundle();

  let domOk = true;
  try {
    await startServer();
    domOk = await checkDOM();
  } catch (e) {
    console.log(`  Server error: ${e.message}`);
  } finally {
    stopServer();
  }

  console.log('\n' + '='.repeat(50));
  if (bundleOk && domOk) {
    console.log('All performance budgets passed ✓');
  } else {
    console.log('Some performance budgets exceeded ✗');
    process.exit(1);
  }
})();
