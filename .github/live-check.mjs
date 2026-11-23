// Opens the live site the way a phone does and walks the main screens. Prints every problem it meets.
import { webkit, chromium, devices } from 'playwright';
import fs from 'fs';
const BASE = 'https://alsubhiismail.github.io/rasd/';
fs.mkdirSync('shots', { recursive: true });
let problems = 0;
async function run(type, devName) {
  const tag = `${type.name()}/${devName}`;
  const browser = await type.launch();
  console.log(`\n===== ${tag} ${browser.version()} =====`);
  const ctx = await browser.newContext({ ...devices[devName], locale: 'ar-OM', timezoneId: 'Asia/Muscat' });
  const page = await ctx.newPage();
  const P = m => { problems++; console.log(`[${tag}] PROBLEM ${m}`); };
  page.on('pageerror', e => P(`pageerror: ${e.message}\n${e.stack || ''}`));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${tag}] console.${m.type()} ${m.text()}`); });
  page.on('requestfailed', r => console.log(`[${tag}] requestfailed ${r.url()} ${r.failure() && r.failure().errorText}`));
  page.on('response', r => { if (r.status() >= 400) console.log(`[${tag}] HTTP ${r.status()} ${r.url()}`); });
  const ready = () => page.waitForFunction(() => { const a = document.querySelector('#app'); return a && !a.querySelector('.loading') && a.children.length > 0; }, null, { timeout: 30000 }).then(() => true, () => false);
  const shot = n => page.screenshot({ path: `shots/${type.name()}-${n}.png` }).catch(() => {});
  const info = () => page.evaluate(() => ({ hash: location.hash, err: (document.querySelector('.card.empty p') || {}).textContent || '', text: ((document.querySelector('#app') || {}).innerText || '').slice(0, 150).replace(/\s+/g, ' ') })).catch(e => ({ hash: '?', err: 'evaluate failed: ' + e.message, text: '' }));
  const visit = async (url, name, sel) => {
    const t0 = Date.now();
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(e => { P(`${name}: goto failed: ${e.message}`); return null; });
    const ok = await ready();
    if (sel) await page.waitForSelector(sel, { timeout: 20000 }).catch(() => P(`${name}: ${sel} never appeared`));
    const i = await info();
    if (!ok) P(`${name}: the app never drew`);
    if (i.err) P(`${name}: error box: ${i.err}`);
    console.log(`[${tag}] ${name}: http=${resp ? resp.status() : '-'} drawn=${ok} ${Date.now() - t0}ms ${i.hash} | ${i.text}`);
    await shot(name);
  };
  const step = async (name, fn) => { try { await fn(); const i = await info(); if (i.err) P(`${name}: error box: ${i.err}`); console.log(`[${tag}] ${name}: ok ${i.hash}`); await shot(name); } catch (e) { P(`${name}: ${e.message.split('\n')[0]}`); await shot(name + '-FAILED'); } };
  const as = async id => { await page.goto(BASE + '?demo=1#/demo'); await page.waitForSelector('.demo-grid'); await page.click(`[data-act="dm-login"][data-id="${id}"]`); await page.waitForTimeout(800); };

  await visit(BASE, '01-main-link', '.demo-grid');
  await visit(BASE + '?demo=1', '02-demo-link', '.demo-grid');
  await visit(BASE + '?u=azb32-sj2xbm', '03-qr-flat-32');
  const storage = await page.evaluate(() => { try { let n = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || '').length; } return n; } catch (e) { return 'unavailable: ' + e.message; } });
  console.log(`[${tag}] stored demo data: ${storage} chars`);
  const img = await page.screenshot({ clip: { x: 0, y: 0, width: 200, height: 150 } });
  await step('04-tenant-reports-flat-12', async () => {
    await page.goto(BASE + '?demo=1#/demo'); await page.waitForSelector('.demo-grid');
    await page.selectOption('#dm-unit', 'azb12-vhbyze'); await page.click('[data-act="dm-unit"]');
    await page.waitForSelector('form[data-form="submit-req"]', { timeout: 15000 });
    await page.click('label.choice:has(input[value="water_leak"])');
    await page.fill('#f-desc', 'تسرّب ماء تحت مغسلة المطبخ');
    await page.setInputFiles('#f-photo', { name: 'leak.png', mimeType: 'image/png', buffer: img });
    await page.waitForSelector('.photo.has img', { timeout: 15000 });
    await page.click('form[data-form="submit-req"] [type="submit"]');
    await page.waitForSelector('.success', { timeout: 15000 });
  });
  await step('05-supervisor-board', async () => { await as('s-sup'); await page.waitForSelector('#blist', { timeout: 15000 }); });
  await step('06-supervisor-dispatch', async () => { await page.waitForSelector('[data-act="dispatch"]', { timeout: 15000 }); await page.click('[data-act="dispatch"]'); await page.waitForSelector('.modal form[data-form="dispatch"]', { timeout: 15000 }); await page.click('.modal form[data-form="dispatch"] [type="submit"]'); await page.waitForTimeout(800); });
  await step('07-manager-board', async () => { await as('s-admin'); await page.waitForSelector('#blist', { timeout: 15000 }); });
  await visit(BASE + '?demo=1#/reports', '08-reports', '.tchart');
  await visit(BASE + '?demo=1#/reports/units', '09-flats-report', '.heat tbody tr');
  await step('10-flat-history', async () => { await page.click('a[href^="#/reports/unit/"]'); await page.waitForSelector('.heat.years', { timeout: 15000 }); });
  await visit(BASE + '?demo=1#/eval', '11-evaluation', '.tech-grid');
  await visit(BASE + '?demo=1#/team', '12-team', '.member');
  await visit(BASE + '?demo=1#/settings', '13-settings', 'form[data-form="settings"]');
  await visit(BASE + '?demo=1#/qr', '14-qr', '.qr-item');
  await step('15-handyman-jobs', async () => { await as('s-h1'); await page.waitForSelector('#jobs', { timeout: 15000 }); });
  await step('16-english', async () => { await page.click('[data-act="lang"]'); await page.waitForTimeout(600); });
  await browser.close();
}
await run(webkit, 'iPhone 13');
await run(webkit, 'iPhone SE');
await run(chromium, 'Pixel 7');
console.log(`\nTOTAL PROBLEMS: ${problems}`);
