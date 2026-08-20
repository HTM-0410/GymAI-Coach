#!/usr/bin/env node
/**
 * scripts/test-video-urls.ts
 * Test video URL pattern for multiple exercises
 */

const VIDEO_CDN = 'https://pub-51593a4f184f42908b6377b56bf19486.r2.dev/male';

async function testUrl(id: string, name: string) {
  const paddedId = String(id).padStart(6, '0');
  const url = `${VIDEO_CDN}/${paddedId}01.mp4`;
  try {
    const res = await fetch(url);
    const size = res.ok ? res.headers.get('content-length') ?? '?' : 'FAIL';
    console.log(`  ${name} (${id}) → ${res.status} | ${size} bytes`);
    return res.ok;
  } catch {
    console.log(`  ${name} (${id}) → ERROR`);
    return false;
  }
}

async function main() {
  const testIds = [
    ['000112', '3-4 Sit-up'],
    ['2512', 'Barbell Bench Press'],
    ['000212', '45 degrees Side Bend'],
    ['000312', 'Abdominal Crises'],
    ['519012', 'Barbell Clean and Jerk'],
    ['507512', 'Barbell Muscle Clean'],
    ['524712', 'Alternating Leg Downward Dog'],
    ['510412', 'Alternate Single Leg Raise Plank'],
    ['999999', 'Non-existent exercise'],
  ];

  console.log('Testing video URL pattern:');
  for (const [id, name] of testIds) {
    await testUrl(id, name);
    await new Promise(r => setTimeout(r, 200));
  }
}

main().catch(err => { console.error(err); process.exit(1); });
