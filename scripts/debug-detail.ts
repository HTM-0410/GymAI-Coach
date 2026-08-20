/** Debug detail page for barbell-bench-press */
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const href = 'https://www.exerciselibrary.app/exercise/2512/barbell-bench-press';
  await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(5000); // wait extra long

  const info = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img')).map((el) => ({
      src: (el as HTMLImageElement).src,
      currentSrc: (el as HTMLImageElement).currentSrc,
      alt: el.alt,
      w: (el as HTMLImageElement).naturalWidth,
      loaded: (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
    }));
    return {
      url: location.href,
      imgs,
      bodyText: document.body.innerHTML.slice(0, 500),
    };
  });

  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((err) => { console.error(err); process.exit(1); });