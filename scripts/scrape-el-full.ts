#!/usr/bin/env node
/**
 * scripts/scrape-el-full.ts
 *
 * Test: Call fetch() inside page.evaluate() for search API.
 * If it works (no CORS error), we can scrape all pages.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT_PATH = path.join(process.cwd(), 'scripts', '.el-full-list.json');
const SLUG_MAP = path.join(process.cwd(), 'scripts', '.exerciselibrary-slug-map.json');

interface ELExercise {
  id: string; name: string; exercise_type: string; gender: string;
  body_part: string; equipment: string; target: string | null; synergist: string | null;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  console.log('Loading homepage...');
  await page.goto('https://www.exerciselibrary.app/', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(5000);

  // Test fetch() inside page context
  console.log('\nTesting fetch() from page.evaluate()...');
  const result = await page.evaluate(async () => {
    const url = 'https://www.exerciselibrary.app/api/exercises?limit=300&gender=Male&page=1';
    try {
      const resp = await fetch(url);
      const body = await resp.json();
      return {
        status: resp.status,
        ok: resp.ok,
        dataLen: body.data?.length,
        pagination: body.pagination,
        firstName: body.data?.[0]?.name,
        error: null
      };
    } catch (e: any) {
      return { error: e.message, name: e.constructor?.name };
    }
  });
  console.log('Result:', JSON.stringify(result, null, 2));

  // If the above works, scrape all pages
  if (!result.error && result.dataLen) {
    console.log('\nFetch works! Scraping all pages...');
    const exercises = await page.evaluate(async () => {
      const all: any[] = [];
      for (let p = 1; p <= 51; p++) {
        const url = `https://www.exerciselibrary.app/api/exercises?limit=300&gender=Male&page=${p}`;
        try {
          const resp = await fetch(url);
          if (!resp.ok) break;
          const body = await resp.json();
          if (!body.data?.length) break;
          all.push(...body.data);
          console.log(`Page ${p}: +${body.data.length} (total: ${all.length})`);
        } catch (e) {
          console.log(`Page ${p} error: ${e}`);
          break;
        }
      }
      return all;
    });

    console.log(`\nCollected: ${exercises.length} exercises`);

    if (exercises.length > 0) {
      await fs.writeFile(OUT_PATH, JSON.stringify(exercises, null, 2), 'utf-8');
      console.log(`Saved → ${OUT_PATH}`);

      const existingMap = JSON.parse(await fs.readFile(SLUG_MAP, 'utf-8')) as Record<string, string>;
      const existingIdToSlug = new Map(Object.entries(existingMap).map(([s, i]) => [i, s]));
      let added = 0;
      for (const ex of exercises) {
        if (!existingIdToSlug.has(ex.id)) {
          const slug = ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          existingMap[slug] = ex.id;
          added++;
        }
      }
      await fs.writeFile(SLUG_MAP, JSON.stringify(existingMap, null, 2), 'utf-8');
      console.log(`Updated slug map: +${added} entries (total: ${Object.keys(existingMap).length})`);
    }
  } else {
    console.log('\nFetch failed. Trying search-based approach...');
    // Type into search box to trigger API calls, collect all responses
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.click();
    await searchInput.type('bench');
    await page.waitForTimeout(3000);
    await searchInput.clear();
    await page.waitForTimeout(1000);
    await searchInput.type('curl');
    await page.waitForTimeout(3000);
  }

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
