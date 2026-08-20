#!/usr/bin/env node
/**
 * scripts/test-gemini.ts
 */

import { readFileSync } from 'node:fs';

const GEMINI_KEY = readFileSync('.env.local', 'utf-8')
  .split('\n').find(l => l.startsWith('GEMINI_API_KEY='))?.split('=')[1]?.trim() ?? '';

async function testModel(model: string) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "OK" in 1 word' }] }],
        }),
      }
    );
    const body = await res.json() as any;
    if (res.ok) {
      console.log(`OK ${model}: ${body.candidates?.[0]?.content?.parts?.[0]?.text}`);
    } else {
      console.log(`FAIL ${model}: ${body.error?.message ?? res.status}`);
    }
  } catch (e: any) {
    console.log(`FAIL ${model}: ${e.message}`);
  }
}

async function main() {
  const models = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.0-flash',
    'gemini-2.5-flash',
  ];
  for (const m of models) { await testModel(m); }
}

main().catch(e => { console.error(e); process.exit(1); });
