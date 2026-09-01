export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const GEMINI_API_KEY =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  'AQ.Ab8RN6KLZdvhI7Ygn4ujj3DsXj-8Dd32dboH_2BUmfmgGJQSHA';

export async function POST(req: Request) {
  try {
    const { messages, userRole } = await req.json();

    let systemPrompt =
      'You are Rescue AI, the official intelligent assistant for RouteRescue LK in Sri Lanka.';

    if (userRole === 'driver') {
      systemPrompt =
        'You are Rescue AI, the roadside assistant for RouteRescue LK motorists in Sri Lanka.\n' +
        'CRITICAL RESPONSE RULES:\n' +
        '1. For simple greetings (e.g. "hi", "hello", "how are you"), reply naturally in 1-2 short sentences without long disclaimers (e.g., "Hello! I am Rescue AI. How can I help you with your vehicle today?").\n' +
        '2. Only provide breakdown safety instructions if the user asks for vehicle help or reports an issue.\n' +
        '3. Keep all responses very short, clear, and easy to read on a mobile phone (maximum 3 brief bullet points, under 50 words total).';
    } else if (userRole === 'mechanic') {
      systemPrompt =
        'You are Rescue AI, technical diagnostic technician for RouteRescue LK mechanics.\n' +
        'Keep responses concise, practical, and under 60 words unless complex diagnostics are requested.';
    } else if (userRole === 'admin') {
      systemPrompt =
        'You are Rescue AI, operations assistant for RouteRescue LK Super Admin.\n' +
        'Keep summaries executive, concise, and under 60 words.';
    }

    const formattedContents = (messages || [])
      .filter((m: any) => m && typeof m.content === 'string' && m.content.trim().length > 0)
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.trim() }],
      }));

    let geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: formattedContents,
        }),
      }
    );

    if (!geminiRes.ok) {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: formattedContents,
          }),
        }
      );
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini REST API Error:', errText);
      return new Response(
        JSON.stringify({ error: 'Failed to communicate with Gemini API' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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
      },
    });

    if (geminiRes.body) {
      return new Response(geminiRes.body.pipeThrough(transformStream), {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      });
    }

    return new Response('Hello! I am Rescue AI. How can I help you today?', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: any) {
    console.error('Rescue AI Route Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error in Rescue AI' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
