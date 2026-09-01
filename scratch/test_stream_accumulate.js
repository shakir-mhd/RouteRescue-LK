const apiKey = 'AQ.Ab8RN6L0R5YjJcrJinWW004z3i9IpB57Vt52A3hhTXpCBam-GA';

async function testStreamAccumulator() {
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: 'You are Rescue AI for RouteRescue LK.' }] },
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
      }),
    }
  );

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let streamBuffer = '';
  let fullOutput = '';

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      streamBuffer += decoder.decode(chunk, { stream: true });
      const matches = [...streamBuffer.matchAll(/"text":\s*"((?:[^"\\]|\\.)*)"/g)];
      for (const m of matches) {
        try {
          const parsed = JSON.parse(`"${m[1]}"`);
          if (parsed && !fullOutput.includes(parsed)) {
            fullOutput += parsed;
            controller.enqueue(encoder.encode(parsed));
          }
        } catch (e) {}
      }
    }
  });

  const liveStream = geminiRes.body.pipeThrough(transformStream);
  const reader = liveStream.getReader();
  let done = false;

  while (!done) {
    const { value, done: d } = await reader.read();
    done = d;
  }

  console.log('FINAL STREAMED OUTPUT:');
  console.log(JSON.stringify(fullOutput));
}

testStreamAccumulator().catch(console.error);
