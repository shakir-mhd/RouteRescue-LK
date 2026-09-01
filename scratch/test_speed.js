const apiKey = 'AQ.Ab8RN6L0R5YjJcrJinWW004z3i9IpB57Vt52A3hhTXpCBam-GA';

async function test35Speed() {
  const start = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
      }),
    }
  );
  const data = await res.json();
  console.log(`[${Date.now() - start}ms] RESPONSE:`, data.candidates?.[0]?.content?.parts?.[0]?.text);
}

test35Speed().catch(console.error);
