export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const GEMINI_API_KEY =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  'AQ.Ab8RN6L0R5YjJcrJinWW004z3i9IpB57Vt52A3hhTXpCBam-GA';

export async function POST(req: Request) {
  try {
    const { messages, userRole } = await req.json();

    let systemPrompt =
      'You are Rescue AI, the roadside assistant for RouteRescue LK motorists in Sri Lanka.\n' +
      'CRITICAL RESPONSE RULES:\n' +
      '1. For simple greetings (e.g. "hi", "hello", "how are you"), reply naturally in 1-2 short sentences without long disclaimers.\n' +
      '2. Only provide breakdown safety instructions if the user asks for vehicle help or reports an issue.\n' +
      '3. Keep all responses clear, complete, and easy to read on a mobile phone (maximum 3 brief bullet points, under 50 words total).';

    if (userRole === 'mechanic') {
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}`,
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
      const lastMsg = (messages?.[messages.length - 1]?.content || '').toLowerCase();
      let fallbackText =
        'Hello! I am Rescue AI, your RouteRescue LK roadside assistant. How can I help you on the road today?';

      if (lastMsg.includes('overheat') || lastMsg.includes('temp') || lastMsg.includes('smoke')) {
        fallbackText =
          '🚨 **Engine Overheating Safety Guide**:\n' +
          '• **Pull Over Safely**: Park on the road shoulder & turn off ignition immediately.\n' +
          '• **Do NOT Open Radiator Cap**: Boiling coolant under pressure causes severe burns.\n' +
          '• **Pop Hood From Inside**: Allow engine heat to vent while waiting for your mechanic.';
      } else if (lastMsg.includes('tire') || lastMsg.includes('tyre') || lastMsg.includes('flat')) {
        fallbackText =
          '🚗 **Flat Tire Emergency Guide**:\n' +
          '• **Turn On Hazard Lights**: Ensure visibility to oncoming drivers.\n' +
          '• **Park on Level Ground**: Engage handbrake firmly before jacking vehicle.\n' +
          '• **Stay Safe**: Stand behind guardrails if on a high-speed road.';
      } else if (lastMsg.includes('battery') || lastMsg.includes('start') || lastMsg.includes('dead')) {
        fallbackText =
          '🔋 **Battery / Starting Guide**:\n' +
          '• **Check Terminals**: Ensure clean, tight connection without corrosion.\n' +
          '• **Jumpstart Caution**: Red (+) to Positive, Black (-) to Ground/Chassis.\n' +
          '• **Dispatch Assistance**: Tap "Report Breakdown" to dispatch a mobile battery unit.';
      }

      return new Response(fallbackText, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      });
    }

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

    return new Response(
      'Hello! I am Rescue AI, your RouteRescue LK assistant. How can I help you today?',
      {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  } catch (err: any) {
    console.error('Rescue AI Route Error:', err);
    return new Response(
      'Hello! I am Rescue AI, your RouteRescue LK assistant. How can I help you today?',
      {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  }
}
