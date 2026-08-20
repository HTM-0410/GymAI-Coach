import { capitalizeVi } from './_capitalize-vi-rule';

const samples = [
  ['Ấn cáp ép tay sau', 'Ấn Cáp Ép Tay Sau'],
  ['Bài tập Burpee toàn thân', 'Bài Tập Burpee Toàn Thân'],
  ['Bài tập giãn cơ toàn thân', 'Bài Tập Giãn Cơ Toàn Thân'],
  ['Bật nhảy xoay 360 độ', 'Bật Nhảy Xoay 360 Độ'],
  ['Bóp dụng cụ lực cẳng tay', 'Bóp Dụng Cụ Lực Cẳng Tay'],
  ['Bulgarian Split Squat tạ đơn', 'Bulgarian Split Squat Tạ Đơn'],
  ['Bước bục chùng chân tạ đơn', 'Bước Bục Chùng Chân Tạ Đơn'],
  ['Burpee kết hợp tạ đơn', 'Burpee Kết Hợp Tạ Đơn'],
  ['Đẩy ngực với tạ đơn', 'Đẩy Ngực Với Tạ Đơn'],
  ['HIIT tabata 20s', 'HIIT Tabata 20s'],
  ['Plank với tạ đơn', 'Plank Với Tạ Đơn'],
  ['Smith Machine Bench Press', 'Smith Machine Bench Press'],
];

let pass = 0, fail = 0;
for (const [inp, want] of samples) {
  const got = capitalizeVi(inp);
  const ok = got === want;
  console.log(`${ok ? 'PASS' : 'FAIL'}  "${inp}" → "${got}"  (want "${want}")`);
  ok ? pass++ : fail++;
}
console.log(`\n${pass}/${samples.length} passed${fail ? `, ${fail} failed` : ''}`);
process.exit(fail ? 1 : 0);
