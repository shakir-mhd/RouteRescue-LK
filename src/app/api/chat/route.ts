import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, userRole } = await req.json();

    let systemPrompt =
      'You are Gearhead AI, the intelligent roadside assistant for RouteRescue LK in Sri Lanka.';

    if (userRole === 'driver') {
      systemPrompt =
        'You are Gearhead AI, the official roadside assistant for RouteRescue LK motorists in Sri Lanka. ' +
        'Provide calm, immediate, step-by-step emergency safety advice for vehicle breakdowns (overheating, flat tire, battery issues, fuel emergency). ' +
        'Keep responses short, actionable, and formatted with bullet points for stranded drivers. Always remind them to turn on hazard lights and stay safe while their mechanic arrives.';
    } else if (userRole === 'mechanic') {
      systemPrompt =
        'You are Gearhead AI, the expert master technician for RouteRescue LK garage owners and mechanics. ' +
        'Provide technical diagnostic guidance, DTC fault code analysis, repair procedures, tool recommendations, and dispatch efficiency tips. ' +
        'Be precise, professional, and practical.';
    } else if (userRole === 'admin') {
      systemPrompt =
        'You are Gearhead AI, the executive operations assistant for RouteRescue LK Super Admin. ' +
        'Provide strategic guidance on platform operations, garage subscription management, Sri Lanka regional dispatch coverage, and platform tariff settings. ' +
        'Keep summaries executive, concise, and operational.';
    }

    const result = streamText({
      model: google('gemini-1.5-flash'),
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (err: any) {
    console.error('Gearhead AI Route Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error in Gearhead AI' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
