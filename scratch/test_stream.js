const apiKey = 'AQ.Ab8RN6KLZdvhI7Ygn4ujj3DsXj-8Dd32dboH_2BUmfmgGJQSHA';

async function testLiveTransformStream() {
  const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Say hi' }] }]
    })
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const textChunk = decoder.decode(chunk, { stream: true });
      const matches = [...textChunk.matchAll(/"text":\s*"((?:[^"\\]|\\.)*)"/g)];
      for (const m of matches) {
        try {
          const parsed = JSON.parse(`"${m[1]}"`);
          if (parsed) {
            controller.enqueue(encoder.encode(parsed));
          }
        } catch (e) {}
      }
    }
  });

  const liveStream = geminiRes.body.pipeThrough(transformStream);
  const reader = liveStream.getReader();
  let done = false;
  console.log('--- STARTING LIVE STREAM READ ---');
  const startTime = Date.now();

  while (!done) {
    const { value, done: d } = await reader.read();
    done = d;
    if (value) {
      const chunkText = decoder.decode(value);
      console.log(`[+${Date.now() - startTime}ms] RECEIVED TOKEN:`, JSON.stringify(chunkText));
    }
  }
  console.log('--- LIVE STREAM COMPLETED ---');
}

testLiveTransformStream().catch(console.error);
