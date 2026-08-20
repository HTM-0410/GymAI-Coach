/**
 * scripts/dump-exerciselibrary-links.ts
 *
 * Dump tất cả link bài tập trên homepage + directory để xây dựng slug map.
 */
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto('https://www.exerciselibrary.app/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Try to scroll the page to trigger lazy loading of more links.
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const links = await page.evaluate(() => {
    const seen = new Set<string>();
    const out: Array<{ id: string; slug: string; href: string; text: string }> = [];
    document.querySelectorAll('a[href*="/exercise/"]').forEach((a) => {
      const href = (a as HTMLAnchorElement).href;
      const m = href.match(/\/exercise\/(\d+)\/([a-z0-9-]+)/);
      if (!m) return;
      const key = m[1];
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ id: m[1], slug: m[2], href, text: (a.textContent ?? '').trim().slice(0, 60) });
    });
    return out;
  });

  console.log(`Found ${links.length} unique exercise links on homepage.`);
  links.slice(0, 50).forEach((l) => console.log(`  [${l.id}] /${l.slug} — ${l.text}`));

  // Also fetch /directory
  console.log('\n--- Loading /directory …');
  await page.goto('https://www.exerciselibrary.app/directory', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const dirLinks = await page.evaluate(() => {
    const seen = new Set<string>();
    const out: Array<{ id: string; slug: string; href: string; text: string }> = [];
    document.querySelectorAll('a[href*="/exercise/"]').forEach((a) => {
      const href = (a as HTMLAnchorElement).href;
      const m = href.match(/\/exercise\/(\d+)\/([a-z0-9-]+)/);
      if (!m) return;
      const key = m[1];
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ id: m[1], slug: m[2], href, text: (a.textContent ?? '').trim().slice(0, 60) });
    });
    return out;
  });
  console.log(`Found ${dirLinks.length} unique exercise links on /directory.`);
  dirLinks.slice(0, 50).forEach((l) => console.log(`  [${l.id}] /${l.slug} — ${l.text}`));

  await browser.close();
})().catch((err) => { console.error(err); process.exit(1); });