import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';

const THUMB_CDN = 'https://pub-51593a4f184f42908b6377b56bf19486.r2.dev/thumbs/male';
const OUT_DIR = path.join(process.cwd(), 'public', 'exercises');

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log('OUT_DIR:', OUT_DIR);
  console.log('cwd:', process.cwd());

  const url = `${THUMB_CDN}/00251201_1.jpg`;
  console.log('Fetching:', url);

  const res = await fetch(url);
  console.log('Status:', res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log('Size:', buf.length, 'bytes');

  const dest = path.join(OUT_DIR, 'barbell-bench-press.jpg');
  console.log('Writing to:', dest);

  await fs.writeFile(dest, buf);

  const stat = await fs.stat(dest);
  console.log('Written! Size on disk:', stat.size);
}

main().catch(console.error);