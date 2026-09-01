const apiKey = 'AQ.Ab8RN6KLZdvhI7Ygn4ujj3DsXj-8Dd32dboH_2BUmfmgGJQSHA';

async function testEmptyPart() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: 'Engine overheating' }] },
        { role: 'model', parts: [{ text: '' }] },
        { role: 'user', parts: [{ text: 'hi' }] }
      ]
    })
  });

  const json = await res.json();
  console.log('STATUS:', res.status);
  console.log('RESPONSE:', JSON.stringify(json, null, 2));
}

testEmptyPart().catch(console.error);
