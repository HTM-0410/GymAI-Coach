#!/usr/bin/env node
/** Import Gym visual dataset into the web app's canonical JSON projection. */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'external', 'exercises-dataset');
const SOURCE_JSON = path.join(SOURCE_DIR, 'data', 'exercises.json');
const OUT_DIR = path.join(ROOT, 'data', 'exercises');
const ARCHIVE_ROOT = path.join(ROOT, 'data', '.archive');
const MEDIA_OUT = path.join(ROOT, 'public', 'exercise-media', 'gymvisual');
const replace = process.argv.includes('--replace');
const limitArg = process.argv.indexOf('--limit');
const limit = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : Infinity;

const MUSCLE: Record<string, string> = {
  abs: 'Cơ bụng', abdominals: 'Cơ bụng', obliques: 'Cơ liên sườn', chest: 'Ngực',
  pectorals: 'Ngực', back: 'Lưng', lats: 'Cơ xô', shoulders: 'Vai', delts: 'Vai',
  biceps: 'Tay trước', triceps: 'Tay sau', forearms: 'Cẳng tay', quads: 'Đùi trước',
  quadriceps: 'Đùi trước', hamstrings: 'Đùi sau', glutes: 'Mông', calves: 'Bắp chân',
  hip_flexors: 'Cơ gấp hông', lower_back: 'Lưng dưới', traps: 'Cơ cầu vai', neck: 'Cổ',
};
const EQUIPMENT: Record<string, string> = {
  'body weight': 'Trọng lượng cơ thể', dumbbell: 'Tạ đơn', barbell: 'Thanh đòn', cable: 'Cáp',
  machine: 'Máy tập', 'leverage machine': 'Máy đòn bẩy', band: 'Dây kháng lực', kettlebell: 'Tạ ấm',
  bench: 'Ghế tập', 'exercise ball': 'Bóng tập', 'foam roll': 'Con lăn', other: 'Khác',
};
const TOKEN: Record<string, string> = {
  barbell: 'Thanh đòn', dumbbell: 'Tạ đơn', kettlebell: 'Tạ ấm', cable: 'Cáp',
  machine: 'Máy', band: 'Dây kháng lực', bodyweight: 'Trọng lượng cơ thể', body: 'Trọng lượng cơ thể',
  weight: 'tạ', press: 'đẩy', curl: 'cuốn tay', raise: 'nâng', row: 'chèo', squat: 'squat',
  deadlift: 'deadlift', lunge: 'chùng chân', fly: 'ép ngực', extension: 'duỗi', crunch: 'gập bụng',
  plank: 'plank', pull: 'kéo', push: 'đẩy', seated: 'ngồi', standing: 'đứng', lying: 'nằm',
  incline: 'dốc lên', decline: 'dốc xuống', front: 'trước', rear: 'sau', lateral: 'sang bên',
};

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function viTokenName(name: string): string {
  const words = name.replace(/[()]/g, '').split(/\s+/).filter(Boolean);
  return words.map((word) => TOKEN[word.toLowerCase()] ?? word).join(' ');
}
function viMuscle(value: unknown): string {
  const key = String(value ?? '').toLowerCase().replace(/\s+/g, '_');
  return MUSCLE[key] ?? String(value || 'Chưa phân loại');
}
function viEquipment(value: unknown): string {
  const key = String(value ?? '').toLowerCase();
  return EQUIPMENT[key] ?? String(value || 'Khác');
}
function movement(name: string): string {
  const n = name.toLowerCase();
  if (/squat|leg press/.test(n)) return 'squat';
  if (/deadlift|good morning|hinge|hyperextension/.test(n)) return 'hinge';
  if (/lunge|split squat|step-up/.test(n)) return 'lunge';
  if (/row|pull|chin|pulldown/.test(n)) return 'pull';
  if (/press|push|dip|push-up|fly/.test(n)) return 'push';
  if (/carry|walk/.test(n)) return 'carry';
  if (/twist|rotation|crunch/.test(n)) return 'rotation';
  return 'isolation';
}

async function copyMedia(source: string, dest: string) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(source, dest);
}

async function main() {
  const raw = JSON.parse(await fs.readFile(SOURCE_JSON, 'utf8')) as any[];
  const records = raw.slice(0, limit);
  if (!records.length) throw new Error('Source dataset empty');
  const slugCounts = new Map<string, number>();
  for (const item of records) {
    const base = slugify(item.name);
    slugCounts.set(base, (slugCounts.get(base) ?? 0) + 1);
  }
  if (replace) {
    await fs.mkdir(ARCHIVE_ROOT, { recursive: true });
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      await fs.rename(OUT_DIR, path.join(ARCHIVE_ROOT, `exercises-${stamp}`));
      console.log(`Archived existing catalog → data/.archive/exercises-${stamp}`);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(MEDIA_OUT, { recursive: true });
  let copied = 0;
  for (const item of records) {
    const id = String(item.id).padStart(4, '0');
    const baseSlug = slugify(item.name);
    const slug = (slugCounts.get(baseSlug) ?? 0) > 1 ? `${baseSlug}-${id}` : baseSlug;
    const gifName = path.basename(String(item.gif_url));
    const imageName = path.basename(String(item.image));
    const sourceGif = path.join(SOURCE_DIR, 'videos', gifName);
    const sourceImage = path.join(SOURCE_DIR, 'images', imageName);
    const outGif = path.join(MEDIA_OUT, `${id}-${item.media_id}.gif`);
    const outImage = path.join(MEDIA_OUT, `${id}-${item.media_id}.jpg`);
    await copyMedia(sourceGif, outGif);
    await copyMedia(sourceImage, outImage);
    const primary = viMuscle(item.target || item.category);
    const secondary = Array.isArray(item.secondary_muscles) ? item.secondary_muscles.map(viMuscle) : [];
    const equipment = [viEquipment(item.equipment)];
    const steps = Array.isArray(item.instruction_steps?.en) ? item.instruction_steps.en : [];
    const ex = {
      slug, name: item.name, name_vi: viTokenName(item.name),
      subtitle_vi: `Bài tập ${viMuscle(item.category).toLowerCase()} với ${equipment.join(', ').toLowerCase()}.`,
      tags: [viMuscle(item.category), ...equipment, 'Gym visual'],
      movement_pattern: movement(item.name), exercise_type: /press|squat|deadlift|row|pull|lunge|dip/i.test(item.name) ? 'compound' : 'isolation',
      difficulty: 'intermediate', primary_muscle: primary, secondary_muscles: secondary, equipment,
      gallery: { main: `/exercise-media/gymvisual/${id}-${item.media_id}.gif`, views: [{ src: `/exercise-media/gymvisual/${id}-${item.media_id}.gif`, label: 'Animation' }], caption_vi: 'Mô phỏng chuyển động bài tập.' },
      goal_vi: `Phát triển ${primary.toLowerCase()} và rèn kỹ thuật chuyển động có kiểm soát.`,
      instructions: steps.length ? steps : ['Đang chờ biên dịch hướng dẫn từ nguồn.'],
      tips: ['Giữ chuyển động chậm và kiểm soát.', 'Dừng lại nếu xuất hiện đau bất thường.'],
      common_mistakes: ['Dùng đà thay vì kiểm soát cơ thể.', 'Thực hiện sai biên độ chuyển động.'],
      setup: { sets: '3', reps: '8-12', rir: '2', rest_seconds: 90, tempo: '2-0-2-0' },
      safety_vi: 'Chọn mức độ phù hợp và giữ tư thế ổn định trong toàn bộ chuyển động.',
      performance_metrics: { current_weight_kg: 0, rep_range: '8-12', estimated_1rm_kg: 0 },
      performance_chart: { labels: ['Buổi 1', 'Buổi 2', 'Buổi 3'], values_kg: [0, 0, 0], goal_kg: 0, min: 0, max: 1 },
      ai_coach: { next_session_vi: `Luyện tập ${viTokenName(item.name)}`, rationale_vi: 'Dữ liệu hiệu suất sẽ được cập nhật sau các buổi tập.' },
      alternatives: [], translation_status: 'machine_pending',
      source: { provider: 'hasaneyldrm/exercises-dataset', source_id: item.id, source_url: `https://github.com/hasaneyldrm/exercises-dataset`, media_id: item.media_id, raw_gif: item.gif_url, raw_image: item.image, languages: Object.keys(item.instructions ?? {}) },
      media_metadata: { version: '1.0.0', last_updated: new Date().toISOString().slice(0, 10), source: 'Gym visual via hasaneyldrm/exercises-dataset', language: 'vi', attribution: '© Gym visual — https://gymvisual.com/', license_status: 'prototype-only; obtain Gym visual license for production' },
    };
    await fs.writeFile(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(ex, null, 2) + '\n', 'utf8');
    copied++;
  }
  await fs.copyFile(path.join(ROOT, 'data', 'exercise-canonical.schema.json'), path.join(OUT_DIR, 'exercise.schema.json'));
  console.log(`Imported ${copied} exercises with ${copied} GIFs + thumbnails.`);
}
main().catch((err) => { console.error(err); process.exit(1); });
