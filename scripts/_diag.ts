// Test different batch API variants
export {};
async function main() {
  const key = process.env.GEMINI_API_KEY ?? '';

  // 1. List batches endpoint
  const r1 = await fetch('https://generativelanguage.googleapis.com/v1beta/batches?key=' + key);
  console.log('list batches:', r1.status, (await r1.text()).slice(0, 300));

  // 2. batchGenerateContent with file_name (placeholder)
  const r2 = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:batchGenerateContent',
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch: { display_name: 't', input_config: { file_name: 'files/test' } },
      }),
    }
  );
  console.log('file_name test:', r2.status, (await r2.text()).slice(0, 300));

  // 3. Try without "display_name"
  const r3 = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:batchGenerateContent',
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch: { input_config: { requests: { requests: [] } } },
      }),
    }
  );
  console.log('empty inline:', r3.status, (await r3.text()).slice(0, 300));

  // 4. Check what models are available
  const r4 = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models?key=' + key
  );
  const t4 = await r4.text();
  console.log('models (truncated):', t4.slice(0, 600));

  // 5. Check API key info
  const r5 = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/cachedContents?key=' + key
  );
  console.log('cached:', r5.status);
}
main().catch(console.error);
