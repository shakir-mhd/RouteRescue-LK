const apiKey = 'AQ.Ab8RN6L0R5YjJcrJinWW004z3i9IpB57Vt52A3hhTXpCBam-GA';

async function testNewKey() {
  const models = [
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest'
  ];

  for (const m of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
        }),
      }
    );
    const json = await res.json();
    if (res.status === 200) {
      console.log(`✅ MODEL ${m} SUCCESS:`, json.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.slice(0, 80));
    } else {
      console.log(`❌ MODEL ${m} [${res.status}]:`, json.error?.message?.slice(0, 120));
    }
  }
}

testNewKey().catch(console.error);
