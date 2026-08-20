const url = 'https://xncmtbenoxqduksxpeee.supabase.co/storage/v1/object/public/exercise-images/3-4-sit-up.jpg';
(async () => {
  try {
    const r = await fetch(url);
    console.log('status:', r.status, 'content-type:', r.headers.get('content-type'));
    console.log('size:', (await r.arrayBuffer()).byteLength);
  } catch (e) {
    console.log('err:', e.message);
  }
})();
