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
        'You are Rescue AI, the official roadside assistant for RouteRescue LK motorists in Sri Lanka. ' +
        'Provide calm, immediate, step-by-step emergency safety advice for vehicle breakdowns (overheating, flat tire, battery issues, fuel emergency). ' +
        'Keep responses short, actionable, and formatted with bullet points for stranded drivers. Always remind them to turn on hazard lights and stay safe while their mechanic arrives.';
    } else if (userRole === 'mechanic') {
      systemPrompt =
        'You are Rescue AI, the expert master technician for RouteRescue LK garage owners and mechanics. ' +
        'Provide technical diagnostic guidance, DTC fault code analysis, repair procedures, tool recommendations, and dispatch efficiency tips. ' +
        'Be precise, professional, and practical.';
    } else if (userRole === 'admin') {
      systemPrompt =
        'You are Rescue AI, the executive operations assistant for RouteRescue LK Super Admin. ' +
        'Provide strategic guidance on platform operations, garage subscription management, Sri Lanka regional dispatch coverage, and platform tariff settings. ' +
        'Keep summaries executive, concise, and operational.';
    }

    const formattedContents = (messages || []).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
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
    } catch (e) {
      console.error('Failed to parse Gemini response array:', e);
    }

    if (!fullText.trim()) {
      fullText =
        'I am Rescue AI, your roadside emergency assistant. Please turn on your hazard lights and stay safe. How can I assist with your vehicle issue right now?';
    }

    return new Response(fullText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
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
