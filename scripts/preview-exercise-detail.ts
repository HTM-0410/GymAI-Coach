// ─── Render HTML Preview ─────────────────────────────────────────────────────
export {};

const mockExercise = {
  name: 'Barbell Bench Press',
  name_vi: 'Đẩy tạ đòn nằm ngang',
  slug: 'barbell-bench-press',
  difficulty: 'intermediate' as const,
  exercise_type: 'compound' as const,
  movement_pattern: 'push' as const,
  description: 'Đẩy tạ đòn nằm ngang là bài tập compound cơ bản nhất cho nhóm ngực. Với tư thế nằm trên ghế dài, đẩy tạ đòn lên khỏi ngực theo phương thẳng đứng, bài tập này kích hoạt mạnh nhất cơ ngực lớn (pectoralis major) cùng với cơ delta trước và cơ ba đầu tay.',
  instructions: [
    'Nằm ngửa trên ghế dài, hai chân đặt chắc chắn trên sàn, mông và vai tiếp xúc với ghế.',
    'Nắm tạ đòn với tư thế tay rộng hơn vai, ngón cái quấn quanh thanh tạ để đảm bảo an toàn.',
    'Hạ tạ đòn xuống ngực dưới, để thanh tạ chạm vào phần ngực giữa.',
    'Giữ khuỷu tay ở góc 45-75 độ so với thân người, không mở rộng quá 90 độ.',
    'Hít sâu vào đầu hít xuống, giữ lưng ép sát ghế và mắt nhìn lên trần.',
    'Đẩy tạ lên theo phương thẳng đứng, ép ngực lại ở vị trí cao nhất, thở ra.',
    'Lặp lại động tác từ đầu. Giữ nhịp đều đặn, không nảy tạ ở vị trí dưới.',
  ],
  tips: [
    'Bắt đầu với thanh tạ không tải để làm quen kỹ thuật trước khi tăng tải trọng.',
    'Giữ thanh tạ di chuyển theo đường thẳng, không để tạ đi về phía đầu hoặc bụng.',
    'Sử dụng spotter khi tập với tải trọng nặng (>80% 1RM).',
    'Tập trung vào mục tiêu negative (hạ tạ chậm 2-3 giây) giúp tăng cơ bắp.',
  ],
  common_mistakes: [
    'Mở khuỷu tay quá rộng (90 độ) gây căng thẳng cho dây chằng vai.',
    'Nâng mông khỏi ghế làm giảm kích hoạt cơ ngực.',
    'Đẩy tạ về phía đầu thay vì thẳng lên, khiến vai làm việc quá mức.',
    'Hạ tạ quá nhanh, để tạ nảy trên ngực thay vì kiểm soát động tác.',
  ],
  default_rest_seconds: 180,
  default_rir: 2,
  muscles: [
    { role: 'primary', name_vi: 'Ngực', slug: 'chest' },
    { role: 'secondary', name_vi: 'Cơ delta trước', slug: 'front_delts' },
    { role: 'secondary', name_vi: 'Cơ ba đầu tay', slug: 'triceps' },
  ],
  equipment: [
    { slug: 'barbell', name_vi: 'Tạ đòn', required: true },
    { slug: 'bench', name_vi: 'Ghế dài', required: true },
  ],
  alternatives: [
    { slug: 'dumbbell-bench-press', name_vi: 'Đẩy tạ đôi nằm ngang' },
    { slug: 'incline-barbell-bench-press', name_vi: 'Đẩy tạ đòn nghiêng trên' },
    { slug: 'machine-chest-press', name_vi: 'Đẩy ngực máy' },
    { slug: 'push-ups', name_vi: 'Hít đất' },
  ],
};

function renderPreview() {
  const ex = mockExercise;
  const diffColor: Record<string, string> = { beginner: '#4ade80', intermediate: '#f97316', advanced: '#f87171' };
  const diffBg: Record<string, string> = { beginner: 'rgba(74,222,128,0.1)', intermediate: 'rgba(249,115,22,0.1)', advanced: 'rgba(248,113,113,0.1)' };
  const typeColor: Record<string, string> = { compound: '#60a5fa', isolation: '#c084fc' };

  const accent = '#f97316';
  const bg = '#0a0a0f';
  const chassis = '#141418';
  const chassisBorder = 'rgba(249,115,22,0.15)';
  const ink = '#f5f5f5';
  const inkMuted = '#6b7280';
  const inkDim = '#3a3a44';

  function css(props: Record<string, string>) {
    return Object.entries(props).map(([k, v]) => `${k}:${v}`).join(';');
  }

  const bolt = `<div style="${css({ position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: 'linear-gradient(135deg, #555 0%, #333 50%, #555 100%)', border: '1px solid #666', boxShadow: 'inset 0 0 2px rgba(0,0,0,0.8)' })}"></div>`;
  const boltTL = bolt.replace("position: 'absolute'", `position: absolute; top: 6px; left: 6px;`);
  const boltTR = bolt.replace("position: 'absolute'", `position: absolute; top: 6px; right: 6px;`);
  const boltBL = bolt.replace("position: 'absolute'", `position: absolute; bottom: 6px; left: 6px;`);
  const boltBR = bolt.replace("position: 'absolute'", `position: absolute; bottom: 6px; right: 6px;`);

  function chassisCard(children: string, style = '') {
    return `<div style="${css({
      position: 'relative', background: chassis, border: `1px solid ${chassisBorder}`,
      borderRadius: '4px', padding: '16px', overflow: 'hidden', ...(style ? {} : {})
    })}${style ? ';' + style : ''}">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${accent},transparent);opacity:0.4"></div>
      ${boltTL}${boltTR}${boltBL}${boltBR}
      <div style="position:relative;z-index:1">${children}</div>
    </div>`;
  }

  function sectionHeader(icon: string, title: string) {
    return `<div style="${css({ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' })}">
      <span style="font-size:14px">${icon}</span>
      <span style="${css({ fontFamily: 'monospace', fontSize: '10px', fontWeight: '700', letterSpacing: '0.12em', color: accent, textTransform: 'uppercase' })}">${title}</span>
      <div style="flex:1;height:1px;background:linear-gradient(90deg,${chassisBorder},transparent)"></div>
    </div>`;
  }

  function statRow(label: string, value: string, accent_ = false) {
    return `<div style="${css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${inkDim}` })}">
      <span style="${css({ fontFamily: 'monospace', fontSize: '10px', color: inkMuted, textTransform: 'uppercase', letterSpacing: '0.08em' })}">${label}</span>
      <span style="${css({ fontSize: '12px', fontWeight: accent_ ? '700' : '500', color: accent_ ? accent : ink })}">${value}</span>
    </div>`;
  }

  function muscleChip(name: string, primary: boolean) {
    return `<span style="${css({
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: primary ? '3px 8px' : '2px 7px',
      borderRadius: '3px', fontSize: '11px', fontWeight: '500',
      background: primary ? `rgba(249,115,22,0.15)` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${primary ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.08)'}`,
      color: primary ? accent : inkMuted
    })}">${name}${primary ? ' ●' : ''}</span>`;
  }

  function equipChip(name: string) {
    return `<span style="${css({
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: '3px', fontSize: '11px',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      color: inkMuted
    })}">${name}</span>`;
  }

  function altLink(name: string) {
    return `<a style="${css({
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 10px', borderRadius: '3px',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      color: inkMuted, fontSize: '12px', transition: 'all 0.15s',
    })}" href="#" onmouseover="this.style.borderColor='rgba(249,115,22,0.3)';this.style.color='${accent}';this.style.background='rgba(249,115,22,0.06)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)';this.style.color='${inkMuted}';this.style.background='rgba(255,255,255,0.03)'">
      <span style="color:${accent};font-size:10px">→</span> ${name}
    </a>`;
  }

  const stepItems = ex.instructions.map((step, i) => {
    const num = String(i + 1).padStart(2, '0');
    return `<div style="${css({ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '7px 0', borderBottom: `1px solid ${inkDim}` })}">
      <div style="${css({
        width: '28px', height: '28px', borderRadius: '3px', flexShrink: '0',
        background: `linear-gradient(135deg, ${accent}33, ${accent}22)`,
        border: `1px solid ${accent}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', color: accent
      })}">${num}</div>
      <p style="${css({ fontSize: '12px', lineHeight: '1.6', color: '#ccc', margin: '4px 0 0' })}">${step}</p>
    </div>`;
  }).join('');

  const tipItems = ex.tips.map(t => `<li style="${css({ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '4px 0', fontSize: '12px', color: '#aaa' })}"><span style="color:${accent};margin-top:2px">•</span><span>${t}</span></li>`).join('');
  const mistakeItems = ex.common_mistakes.map(m => `<li style="${css({ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '4px 0', fontSize: '12px', color: '#aaa' })}"><span style="color:#eab308;margin-top:2px">•</span><span>${m}</span></li>`).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Preview: ${ex.name_vi} — GymAI Coach</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${bg}; color: ${ink}; font-family: 'Inter', system-ui, sans-serif; min-height: 100vh; }
  .blueprint-bg {
    background-image:
      linear-gradient(rgba(249,115,22,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(249,115,22,0.025) 1px, transparent 1px);
    background-size: 24px 24px;
  }
  .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
  a { color: inherit; text-decoration: none; }
</style>
</head>
<body class="blueprint-bg" style="padding: 20px 16px 80px; min-height:100vh; max-width:1200px; margin:0 auto; width:100%;">

  <!-- ── BREADCRUMB ── -->
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:16px;">
    <a href="#" style="font-size:12px;color:#6b7280;transition:color 0.15s;" onmouseover="this.style.color='${accent}'" onmouseout="this.style.color='#6b7280'">Thư viện</a>
    <span style="color:#3a3a44;font-size:12px">›</span>
    <a href="#" style="font-size:12px;color:#6b7280;transition:color 0.15s;" onmouseover="this.style.color='${accent}'" onmouseout="this.style.color='#6b7280'">Ngực</a>
    <span style="color:#3a3a44;font-size:12px">›</span>
    <span style="font-size:12px;color:${ink}">${ex.name_vi}</span>
  </div>

  <!-- ── MAIN LAYOUT ── -->
  <div style="display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start;">

    <!-- ── LEFT: Media + Info ── -->
    <div style="display:flex;flex-direction:column;gap:14px;">

      <!-- HEADER -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${accent};box-shadow:0 0 8px ${accent}88"></div>
            <span style="font-family:monospace;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#6b7280">Exercise</span>
          </div>
          <h1 style="font-size:28px;font-weight:800;color:${ink};line-height:1.1;letter-spacing:-0.02em;">${ex.name_vi}</h1>
          <p style="font-family:monospace;font-size:12px;color:#6b7280;margin-top:3px;">${ex.name}</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding-top:4px;">
          <span style="padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;background:${typeColor[ex.exercise_type]}20;border:1px solid ${typeColor[ex.exercise_type]}44;color:${typeColor[ex.exercise_type]}">${ex.exercise_type}</span>
          <span style="padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;background:${diffBg[ex.difficulty]};border:1px solid ${diffColor[ex.difficulty]}44;color:${diffColor[ex.difficulty]}">${ex.difficulty}</span>
          <span style="padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.2);color:${accent}">${ex.movement_pattern}</span>
        </div>
      </div>

      <!-- MEDIA GALLERY -->
      ${chassisCard(`
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="aspect-ratio:16/9;background:linear-gradient(135deg,#1a1a22,#0f0f15);border-radius:3px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.05);">
            <div style="text-align:center">
              <div style="font-size:40px;margin-bottom:8px">🏋️</div>
              <span style="font-family:monospace;font-size:10px;letter-spacing:0.1em;color:#555;text-transform:uppercase">[Media — Phase 2: Video / GIF]</span>
            </div>
          </div>
          <!-- Thumbnail strip -->
          <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;">
            ${['Front', 'Side', 'Top', 'Angle'].map(t => `
              <div style="width:60px;height:40px;flex-shrink:0;border-radius:3px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:9px;font-family:monospace;color:#555;cursor:pointer;transition:border-color 0.15s;" onmouseover="this.style.borderColor='${accent}55'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)'">${t}</div>
            `).join('')}
          </div>
        </div>
      `)}

      <!-- DESCRIPTION -->
      ${chassisCard(`
        ${sectionHeader('📋', 'Mô tả')}
        <p style="font-size:13px;line-height:1.75;color:#bbb;">${ex.description}</p>
      `)}

      <!-- INSTRUCTIONS -->
      ${chassisCard(`
        ${sectionHeader('↻', 'Cách thực hiện')}
        ${stepItems}
      `)}

      <!-- TIPS + MISTAKES (2 col) -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        ${chassisCard(`
          ${sectionHeader('💡', 'Tips')}
          <ul style="list-style:none;display:flex;flex-direction:column;gap:6px;">${tipItems}</ul>
        `)}
        ${chassisCard(`
          ${sectionHeader('⚠', 'Lỗi thường gặp')}
          <ul style="list-style:none;display:flex;flex-direction:column;gap:6px;">${mistakeItems}</ul>
        `)}
      </div>

    </div>

    <!-- ── RIGHT: Stats Rail ── -->
    <div style="display:flex;flex-direction:column;gap:14px;position:sticky;top:20px;">

      <!-- MAIN STATS TABLE -->
      ${chassisCard(`
        ${sectionHeader('📊', 'Chi tiết bài tập')}
        ${statRow('Nhóm cơ chính', ex.muscles.find(m => m.role === 'primary')?.name_vi ?? '—', true)}
        ${statRow('Nhóm cơ phụ', ex.muscles.filter(m => m.role === 'secondary').map(m => m.name_vi).join(', ') ?? '—')}
        ${statRow('Loại bài tập', ex.exercise_type)}
        ${statRow('Độ khó', ex.difficulty)}
        ${statRow('Pattern', ex.movement_pattern)}
        ${statRow('Thiết bị', ex.equipment.map(e => e.name_vi).join(', '))}
        ${statRow('Nghỉ mặc định', `${ex.default_rest_seconds}s`)}
        ${statRow('RIR mặc định', String(ex.default_rir))}
      `)}

      <!-- MUSCLE CHIPS -->
      ${chassisCard(`
        ${sectionHeader('🎯', 'Nhóm cơ')}
        <div class="chip-row">${ex.muscles.map(m => muscleChip(m.name_vi, m.role === 'primary')).join('')}</div>
      `)}

      <!-- EQUIPMENT CHIPS -->
      ${chassisCard(`
        ${sectionHeader('🏋', 'Thiết bị')}
        <div class="chip-row">${ex.equipment.map(e => equipChip(e.name_vi)).join('')}</div>
      `)}

      <!-- ALTERNATIVES -->
      ${chassisCard(`
        ${sectionHeader('🔄', 'Bài thay thế')}
        <div style="display:flex;flex-direction:column;gap:5px;">${ex.alternatives.map(a => altLink(a.name_vi)).join('')}</div>
      `)}

      <!-- AI COACH CTA -->
      ${chassisCard(`
        <div style="text-align:center;padding:8px 0;">
          <div style="font-size:22px;margin-bottom:8px;">🤖</div>
          <div style="font-family:monospace;font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${accent};margin-bottom:4px;">AI Coach</div>
          <p style="font-size:12px;color:#6b7280;margin-bottom:12px;line-height:1.5;">Hỏi AI về kỹ thuật, cách sửa form và lịch tập phù hợp</p>
          <button style="width:100%;padding:10px;border:none;border-radius:4px;background:linear-gradient(135deg,${accent},#ea580c);color:white;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:0.02em;box-shadow:0 0 16px ${accent}44;transition:all 0.2s;" onmouseover="this.style.boxShadow='0 0 24px ${accent}66'" onmouseout="this.style.boxShadow='0 0 16px ${accent}44'">💬 Hỏi AI Coach</button>
        </div>
      `)}

      <!-- QUICK ADD -->
      ${chassisCard(`
        <button style="width:100%;padding:10px;border:1px solid ${accent}44;border-radius:4px;background:rgba(249,115,22,0.08);color:${accent};font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;letter-spacing:0.02em;" onmouseover="this.style.background='rgba(249,115,22,0.15)';this.style.borderColor='${accent}88'" onmouseout="this.style.background='rgba(249,115,22,0.08)';this.style.borderColor='${accent}44'">＋ Thêm vào Workout</button>
      `)}

    </div>
  </div>

</body>
</html>`;
}

async function main() {
  const fs = await import('fs');
  const html = renderPreview();
  fs.writeFileSync('scripts/preview-exercise-detail.html', html, 'utf-8');
  console.log('Preview written to: scripts/preview-exercise-detail.html');
  console.log('\nDesign changes applied:');
  console.log('  ✓ Industrial chassis cards with bolt corners');
  console.log('  ✓ Breadcrumb navigation');
  console.log('  ✓ Media gallery with thumbnail strip');
  console.log('  ✓ Right rail: table-format stats + sticky positioning');
  console.log('  ✓ High-density layout');
  console.log('  ✓ AI Coach CTA panel');
  console.log('  ✓ Color-coded badges (type + difficulty)');
}

main().catch(console.error);
