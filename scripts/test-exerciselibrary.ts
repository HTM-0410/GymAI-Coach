/**
 * scripts/test-exerciselibrary.ts
 *
 * Sanity-check: dùng Playwright render React trang chi tiết bài tập,
 * dump tất cả <video>/<img>/<link rel="preload"> để tìm URL media thật.
 *
 * Chạy:
 *   npx tsx scripts/test-exerciselibrary.ts <slug>
 *   npx tsx scripts/test-exerciselibrary.ts barbell-back-squat
 */
import { chromium } from 'playwright';

const TEST_SLUG = process.argv[2] ?? 'barbell-back-squat';
const URL = `https://www.exerciselibrary.app/exercise/squat/${TEST_SLUG}`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log(`Navigating: ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait an extra moment for any React hydration + lazy chunks.
  await page.waitForTimeout(2500);

  // Dump all media URLs and link[rel=preload] candidates.
  const found = await page.evaluate(() => {
    const out: Record<string, any> = { imgs: [], videos: [], sources: [], preloads: [], bgImages: [] };

    document.querySelectorAll('img').forEach((el) => {
      out.imgs.push({
        src: (el as HTMLImageElement).currentSrc || el.src,
        srcset: el.getAttribute('srcset'),
        alt: el.alt,
        w: (el as HTMLImageElement).naturalWidth,
        h: (el as HTMLImageElement).naturalHeight,
        loading: el.loading,
      });
    });

    document.querySelectorAll('video').forEach((el) => {
      const v = el as HTMLVideoElement;
      out.videos.push({
        src: v.currentSrc || v.src,
        poster: v.poster,
        sources: Array.from(v.querySelectorAll('source')).map((s) => s.src),
        preload: v.preload,
      });
    });

    document.querySelectorAll('link[rel="preload"], link[rel="prefetch"]').forEach((el) => {
      out.preloads.push({ rel: el.rel, as: el.getAttribute('as'), href: el.href });
    });

    // Inline background-image URLs
    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none') {
        const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (m) out.bgImages.push(m[1]);
      }
    });

    return out;
  });

  console.log(JSON.stringify(found, null, 2));

  await browser.close();
})().catch((err) => { console.error(err); process.exit(1); });