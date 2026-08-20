/** Debug listing page to understand where thumbnail comes from */
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto('https://www.exerciselibrary.app/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(5000);

  // Scroll to trigger lazy load
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // Find barbell-bench-press link and check surrounding HTML
  const info = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/exercise/"]'));
    const bench = anchors.find((a) => a.href.includes('barbell-bench-press'));
    if (!bench) return { found: false };
    const parent = bench.closest('div');
    const grandParent = parent?.parentElement;
    return {
      found: true,
      anchorHref: bench.href,
      anchorHTML: bench.outerHTML.slice(0, 300),
      parentTag: parent?.tagName,
      parentClass: parent?.className?.slice(0, 200),
      grandParentTag: grandParent?.tagName,
      grandParentHTML: grandParent?.outerHTML?.slice(0, 500),
      // Find img near bench link
      nearbyImgs: Array.from(parent?.querySelectorAll('img') ?? [])
        .map((img) => ({ src: (img as HTMLImageElement).src, alt: img.alt, w: (img as HTMLImageElement).naturalWidth })),
    };
  });

  console.log(JSON.stringify(info, null, 2));

  // Also look for img tags anywhere with thumbs
  const thumbs = await page.evaluate(() => {
    const allImgs = Array.from(document.querySelectorAll('img'));
    return allImgs
      .filter((el) => /\/thumbs\//.test((el as HTMLImageElement).src))
      .map((el) => ({ src: (el as HTMLImageElement).src, alt: el.alt }))
      .slice(0, 5);
  });
  console.log('\nThumbs found:', JSON.stringify(thumbs, null, 2));

  await browser.close();
})().catch((err) => { console.error(err); process.exit(1); });
