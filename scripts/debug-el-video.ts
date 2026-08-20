#!/usr/bin/env node
/**
 * scripts/debug-el-video.ts
 */

import { promises as fs } from 'node:fs';

async function main() {
  // Test video URL
  const url = 'https://pub-51593a4f184f42908b6377b56bf19486.r2.dev/male/00011201.mp4';
  console.log('Trying to fetch:', url);

  try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Content-Length:', res.headers.get('content-length'));
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      console.log('Downloaded:', buf.length, 'bytes');
      await fs.writeFile('d:/GymAI-Coach/scripts/test-video.mp4', buf);
      console.log('Saved → scripts/test-video.mp4');
    } else {
      console.log('Failed to download');
    }
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}

main();
