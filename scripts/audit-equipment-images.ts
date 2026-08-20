#!/usr/bin/env node
/* eslint-disable no-console */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

function loadEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  const envPath = path.join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (!match || match[1].startsWith('#') || process.env[match[1]]) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

type EquipmentRow = {
  id: string;
  slug: string;
  name: string;
  name_vi: string | null;
  category: string | null;
  image_url: string | null;
};

type AuditRow = EquipmentRow & {
  index: number;
  source: 'local' | 'remote' | 'missing';
  resolved_path: string | null;
  load_status: 'ok' | 'missing' | 'error';
  error: string | null;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  sha256: string | null;
  average_hash: string | null;
};

const OUTPUT_DIR = path.join(process.cwd(), 'artifacts', 'equipment-image-audit');
const REMOTE_DIR = path.join(OUTPUT_DIR, 'remote');
const SHEET_DIR = path.join(OUTPUT_DIR, 'sheets');
const TILE_WIDTH = 480;
const TILE_HEIGHT = 350;
const IMAGE_WIDTH = 440;
const IMAGE_HEIGHT = 255;
const COLS = 3;
const ROWS = 4;
const PER_SHEET = COLS * ROWS;

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  }[char] ?? char));
}

async function averageHash(buffer: Buffer) {
  const pixels = await sharp(buffer).resize(16, 16, { fit: 'fill' }).greyscale().raw().toBuffer();
  const mean = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;
  let bits = '';
  for (const value of pixels) bits += value >= mean ? '1' : '0';
  let hex = '';
  for (let index = 0; index < bits.length; index += 4) {
    hex += Number.parseInt(bits.slice(index, index + 4), 2).toString(16);
  }
  return hex;
}

async function resolveImage(row: EquipmentRow): Promise<{ buffer: Buffer | null; source: AuditRow['source']; resolvedPath: string | null; error: string | null }> {
  if (!row.image_url) return { buffer: null, source: 'missing', resolvedPath: null, error: 'image_url is empty' };

  if (row.image_url.startsWith('/')) {
    const localPath = path.join(process.cwd(), 'public', row.image_url.replace(/^\/+/, ''));
    if (!existsSync(localPath)) return { buffer: null, source: 'local', resolvedPath: localPath, error: 'local file not found' };
    return { buffer: await fs.readFile(localPath), source: 'local', resolvedPath: localPath, error: null };
  }

  try {
    const response = await fetch(row.image_url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const extension = row.image_url.includes('.png') ? 'png' : row.image_url.includes('.webp') ? 'webp' : 'jpg';
    const remotePath = path.join(REMOTE_DIR, `${row.slug}.${extension}`);
    await fs.writeFile(remotePath, buffer);
    return { buffer, source: 'remote', resolvedPath: remotePath, error: null };
  } catch (error) {
    return { buffer: null, source: 'remote', resolvedPath: row.image_url, error: error instanceof Error ? error.message : String(error) };
  }
}

async function createContactSheet(rows: AuditRow[], sheetIndex: number) {
  const width = TILE_WIDTH * COLS;
  const height = TILE_HEIGHT * ROWS;
  const composites: sharp.OverlayOptions[] = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const left = (index % COLS) * TILE_WIDTH;
    const top = Math.floor(index / COLS) * TILE_HEIGHT;
    let image: Buffer;
    if (row.load_status === 'ok' && row.resolved_path) {
      image = await sharp(row.resolved_path)
        .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: 'contain', background: '#f4f5f7' })
        .flatten({ background: '#f4f5f7' })
        .png()
        .toBuffer();
    } else {
      image = Buffer.from(`<svg width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#2a2f38"/><text x="50%" y="50%" text-anchor="middle" fill="#ff6b35" font-family="Arial" font-size="25" font-weight="700">MISSING / ERROR</text></svg>`);
    }
    composites.push({ input: image, left: left + 20, top: top + 10 });

    const label = Buffer.from(`<svg width="${TILE_WIDTH}" height="85" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#111722"/>
      <text x="18" y="24" fill="#ff701a" font-family="Arial" font-size="17" font-weight="700">#${row.index} ${escapeXml(row.slug)}</text>
      <text x="18" y="49" fill="#ffffff" font-family="Arial" font-size="17" font-weight="700">${escapeXml(row.name_vi ?? row.name)}</text>
      <text x="18" y="70" fill="#aeb8c8" font-family="Arial" font-size="13">${escapeXml(row.category ?? 'no-category')} · ${row.width ?? '?'}×${row.height ?? '?'} · ${row.bytes ?? 0} bytes</text>
    </svg>`);
    composites.push({ input: label, left, top: top + 265 });
  }

  await sharp({ create: { width, height, channels: 3, background: '#0c1017' } })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toFile(path.join(SHEET_DIR, `sheet-${String(sheetIndex + 1).padStart(2, '0')}.jpg`));
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment variables.');

  await fs.mkdir(REMOTE_DIR, { recursive: true });
  await fs.mkdir(SHEET_DIR, { recursive: true });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase
    .from('equipment')
    .select('id, slug, name, name_vi, category, image_url')
    .order('category')
    .order('name_vi');
  if (error) throw error;

  const rows = (data ?? []) as EquipmentRow[];
  const auditRows: AuditRow[] = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const resolved = await resolveImage(row);
    const base: AuditRow = {
      ...row,
      index: index + 1,
      source: resolved.source,
      resolved_path: resolved.resolvedPath,
      load_status: resolved.buffer ? 'ok' : resolved.error === 'image_url is empty' || resolved.error === 'local file not found' ? 'missing' : 'error',
      error: resolved.error,
      format: null,
      width: null,
      height: null,
      bytes: resolved.buffer?.length ?? null,
      sha256: null,
      average_hash: null,
    };
    if (resolved.buffer) {
      try {
        const metadata = await sharp(resolved.buffer).metadata();
        base.format = metadata.format ?? null;
        base.width = metadata.width ?? null;
        base.height = metadata.height ?? null;
        base.sha256 = createHash('sha256').update(resolved.buffer).digest('hex');
        base.average_hash = await averageHash(resolved.buffer);
      } catch (imageError) {
        base.load_status = 'error';
        base.error = imageError instanceof Error ? imageError.message : String(imageError);
      }
    }
    auditRows.push(base);
    console.log(`[${base.index}/${rows.length}] ${base.slug}: ${base.load_status}`);
  }

  await fs.writeFile(path.join(OUTPUT_DIR, 'technical-audit.json'), `${JSON.stringify(auditRows, null, 2)}\n`);

  const exactGroups = Object.values(Object.groupBy(auditRows.filter((row) => row.sha256), (row) => row.sha256!))
    .filter((group) => (group?.length ?? 0) > 1)
    .map((group) => group!.map((row) => ({ index: row.index, slug: row.slug, name_vi: row.name_vi, sha256: row.sha256 })));
  const perceptualGroups = Object.values(Object.groupBy(auditRows.filter((row) => row.average_hash), (row) => row.average_hash!))
    .filter((group) => (group?.length ?? 0) > 1)
    .map((group) => group!.map((row) => ({ index: row.index, slug: row.slug, name_vi: row.name_vi, average_hash: row.average_hash })));
  await fs.writeFile(path.join(OUTPUT_DIR, 'duplicate-groups.json'), `${JSON.stringify({ exact: exactGroups, perceptual: perceptualGroups }, null, 2)}\n`);

  for (let offset = 0, sheetIndex = 0; offset < auditRows.length; offset += PER_SHEET, sheetIndex++) {
    await createContactSheet(auditRows.slice(offset, offset + PER_SHEET), sheetIndex);
  }

  console.log(JSON.stringify({
    total: auditRows.length,
    ok: auditRows.filter((row) => row.load_status === 'ok').length,
    missing: auditRows.filter((row) => row.load_status === 'missing').length,
    error: auditRows.filter((row) => row.load_status === 'error').length,
    exactDuplicateGroups: exactGroups.length,
    perceptualDuplicateGroups: perceptualGroups.length,
    sheets: Math.ceil(auditRows.length / PER_SHEET),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
