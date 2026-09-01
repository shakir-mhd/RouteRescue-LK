const apiKey = 'AQ.Ab8RN6L0R5YjJcrJinWW004z3i9IpB57Vt52A3hhTXpCBam-GA';

async function testCompleteText() {
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

  const rawText = await geminiRes.text();
  let fullText = '';
  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) {
      for (const chunk of parsed) {
        const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
        fullText += chunkText;
      }
    }
  } catch (e) {}

  console.log('COMPLETE TEXT RESULT:');
  console.log(JSON.stringify(fullText));
}

testCompleteText().catch(console.error);
