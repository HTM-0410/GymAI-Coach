/**
 * scripts/test-exerciselibrary-home.ts
 *
 * Browse homepage, click vào link bài tập đầu tiên, dump tất cả media.
 */
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('Loading homepage…');
  await page.goto('https://www.exerciselibrary.app/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Find first anchor that points to /exercise/<something>/<something>
  const firstExerciseHref = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a'))
      .map((el) => el.href)
      .find((h) => /\/exercise\/[a-z0-9-]+\/[a-z0-9-]+/.test(h));
    return a ?? null;
  });

  if (!firstExerciseHref) {
    console.log('No /exercise/ link found on homepage. Dumping sample anchors:');
    const sample = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a')).slice(0, 30).map((a) => a.href),
    );
    console.log(JSON.stringify(sample, null, 2));
    await browser.close();
    return;
  }

  console.log(`Found first exercise link: ${firstExerciseHref}`);
  await page.goto(firstExerciseHref, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Look around for any media URL on the rendered page.
  const media = await page.evaluate(() => {
    const out: any = { imgs: [], videos: [], sources: [], iframes: [], preloads: [], bgImages: [] };

    document.querySelectorAll('img').forEach((el) => {
      const src = (el as HTMLImageElement).currentSrc || el.src;
      if (!src || src.startsWith('data:')) return;
      out.imgs.push({ src, alt: el.alt });
    });

    document.querySelectorAll('video').forEach((el) => {
      const v = el as HTMLVideoElement;
      out.videos.push({
        src: v.currentSrc || v.src,
        poster: v.poster,
        sources: Array.from(v.querySelectorAll('source')).map((s) => s.src),
      });
    });

    document.querySelectorAll('iframe').forEach((el) => {
      out.iframes.push({ src: (el as HTMLIFrameElement).src, title: el.title });
    });

    document.querySelectorAll('link[rel="preload"], link[rel="prefetch"]').forEach((el) => {
      out.preloads.push({ rel: el.rel, as: el.getAttribute('as'), href: el.href });
    });

    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none') {
        const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (m && !m[1].startsWith('data:')) out.bgImages.push(m[1]);
      }
    });

    return out;
  });

  console.log(JSON.stringify(media, null, 2));

  // Also dump html length and any image-like tokens from page source.
  const html = await page.content();
  console.log('\n--- HTML size:', html.length);
  const urls = [...new Set([...html.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map((m) => m[0]))]
    .filter((u) => /\.(mp4|webm|webp|png|jpg|jpeg|gif|svg|m3u8|ts)/i.test(u) || u.includes('cloudfront') || u.includes('r2.dev'));
  console.log('--- media URLs in raw HTML:');
  urls.forEach((u) => console.log(' ', u));

  await browser.close();
})().catch((err) => { console.error(err); process.exit(1); });