const apiKey = 'AQ.Ab8RN6KLZdvhI7Ygn4ujj3DsXj-8Dd32dboH_2BUmfmgGJQSHA';

async function check36() {
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
      }),
    }
  );
  console.log('STATUS 3.6:', geminiRes.status);
  console.log('BODY 3.6:', await geminiRes.text());
}

check36().catch(console.error);
