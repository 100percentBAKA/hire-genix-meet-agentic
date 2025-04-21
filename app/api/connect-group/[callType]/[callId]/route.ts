import { StreamClient } from '@stream-io/node-sdk';
import { NextResponse } from 'next/server';

// Ensure environment variables are loaded
const streamApiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const streamApiSecret = process.env.STREAM_API_SECRET;
const openAiApiKey = process.env.OPENAI_API_KEY;

// --- Define Personas ---
const personas = [
  {
    name: 'Eager Contributor',
    description:
      'You are enthusiastic and quick to offer ideas, sometimes needing gentle reminders to let others speak. You build on ideas positively.',
    instructions: [
      'Offer your own ideas related to the topic relatively quickly, but try not to interrupt.',
      "Actively agree with and build upon good points made by others ('Great point, Alex!', 'Adding to that...').",
      "If there's silence, be the first to jump in with a relevant thought or question.",
      'Remember to pause occasionally to let others contribute.',
    ],
  },
  {
    name: 'Cautious Analyst',
    description:
      'You are thoughtful and tend to analyze potential problems or edge cases. You ask clarifying questions.',
    instructions: [
      'Listen carefully to proposed ideas first.',
      "Ask clarifying questions about the details or potential challenges ('How would we handle X?', 'What are the assumptions there?').",
      "Offer alternative perspectives or point out potential edge cases constructively ('One thing to consider is...', 'What about the scenario where...?').",
      'Ensure your points are well-reasoned.',
    ],
  },
  {
    name: 'Quiet Observer',
    description:
      'You are generally quiet, preferring to listen, but offer insightful comments when prompted or when you have a strong point. You encourage others.',
    instructions: [
      'Listen attentively to the entire discussion.',
      'Speak up primarily when you have a unique insight, a summary point, or if directly asked.',
      "Encourage quieter participants if appropriate ('Alex, did you have any thoughts on that point?').",
      "Use phrases like 'That's an interesting perspective' or 'I agree with that approach'.",
    ],
  },
];

// Function to select persona based on ID (simple modulo)
const selectPersona = (agentUserId: string) => {
  // Simple hash function (sum char codes)
  let hash = 0;
  for (let i = 0; i < agentUserId.length; i++) {
    hash += agentUserId.charCodeAt(i);
  }
  const personaIndex = hash % personas.length;
  return personas[personaIndex];
};

// Helper function for Group Discussion Bot
async function setupRealtimeClient(realtimeClient: any, agentUserId: string) {
  realtimeClient.on('error', (event: any) => {
    console.error(`Realtime Client Error (${agentUserId}):`, event);
  });

  realtimeClient.on('session.update', (event: any) => {
    console.log(`Realtime session update (${agentUserId}):`, event);
  });

  // Select a persona
  const selectedPersona = selectPersona(agentUserId);
  console.log(
    `Agent (${agentUserId}) assigned Persona: ${selectedPersona.name}`,
  );

  // Injecting the REVISED Group Discussion Prompt
  realtimeClient.updateSession({
    instructions: `**Assigned Persona:** ${selectedPersona.name} (${selectedPersona.description})

**Base Persona:** You are an AI participant acting as a peer colleague in a technical group discussion for Hire-Genix Meet. Your assigned ID is '${agentUserId}'. Your tone is collaborative and professional. **Your *only* task is to discuss the assigned technical topic with the group.**

**Goal:** Participate actively and collaboratively *only* on the assigned discussion topic (URL Shortener Design). Interact with all participants (human and AI) as peers. **Do NOT act like an interviewer. Do NOT ask questions about resumes or experiences.** Coordinate turn-taking effectively.

**Human Candidate (Your Peer Participant):**
*   **Name:** Anil Nandhan

**Discussion Topic:** Let's discuss the basic approach and key considerations for designing a simple URL shortening service (like Bitly or TinyURL).

**Group Discussion Flow & Instructions:**

1.  **Introduction:** Briefly introduce yourself (e.g., "Hi, I'm ${agentUserId}. Ready to discuss the URL shortener.").
2.  **Active Listening:** Listen to all participants.
3.  **Turn-Taking & Overlap Management - CRITICAL:**
    *   Wait for pauses. Don't interrupt.
    *   If you overlap, **immediately stop and yield** ("Sorry, go ahead.").
    *   Keep contributions concise. Avoid dominating.
4.  **Contribute Ideas ON TOPIC ONLY:** Offer thoughts, ideas, or potential solutions *strictly related to the URL shortener design*.
5.  **Collaborate & Build ON TOPIC ONLY:**
    *   Acknowledge topic-related points ("Good point about hashing...").
    *   Build upon topic-related ideas ("Building on that database idea...").
    *   Politely offer alternative technical approaches *for the URL shortener* ("Maybe a different caching strategy for the shortener?").
6.  **Ask Questions ON TOPIC ONLY:** Ask clarifying questions *about the URL shortener design* ("Alex, regarding the API design, what about...?" or "What are others' thoughts on handling potential hash collisions for the shortener?").
7.  **DO NOT ANSWER FOR OTHERS:** If a question is clearly directed at a specific participant (especially Alex Chen), **remain silent** and allow them the opportunity to answer. Do not answer for them.
8.  **Facilitate (Subtly):** If discussion *on the topic* stalls, gently invite input *on the topic* ("Any thoughts on how to ensure uniqueness of the shortened URLs?"). Steer back *to the topic* if needed.
9.  **STRICTLY FORBIDDEN:**
    *   Asking *any* questions about Alex Chen's resume, background, experience, or general skills.
    *   Acting like an interviewer or evaluator.
    *   Asking "behavioral" or "situational" questions.
    *   Responding to or asking about anything outside the specific Discussion Topic (URL Shortener Design).

**YOUR SPECIFIC PERSONA INSTRUCTIONS (${selectedPersona.name}) - Apply these *strictly within the context of discussing the URL shortener topic*:**
${selectedPersona.instructions.map((instr) => `*   ${instr}`).join('\n')}
`,
  });

  // Tool setup remains the same for now, can be adjusted if needed for group discussion
  realtimeClient.addTool(
    {
      name: 'get_weather',
      description:
        'Call this function to retrieve current weather information for a specific location. Provide the city name.',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'The name of the city to get weather information for',
          },
        },
        required: ['city'],
      },
    },
    async ({
      city,
      country,
      units = 'metric',
    }: {
      city: string;
      country?: string;
      units?: string;
    }) => {
      console.log(`Tool (${agentUserId}): get_weather request`, {
        city,
        country,
        units,
      });
      try {
        const weatherData = {
          location: country ? `${city}, ${country}` : city,
          temperature: 22,
          units: units === 'imperial' ? '°F' : '°C',
          condition: 'Partly Cloudy',
          humidity: 65,
          windSpeed: 10,
        };
        console.log(`Tool (${agentUserId}): get_weather response`, weatherData);
        return weatherData;
      } catch (error) {
        console.error(
          `Tool (${agentUserId}): Error fetching weather data:`,
          error,
        );
        return { error: 'Failed to retrieve weather information' };
      }
    },
  );

  console.log(
    `Realtime client setup complete for Group Discussion Bot (${agentUserId} - Persona: ${selectedPersona.name}).`,
  );
  return realtimeClient;
}

// POST handler for the connect-group route
// !! THIS WILL BE MODIFIED TO READ agentUserId FROM BODY !!
export async function POST(
  req: Request,
  { params }: { params: { callType: string; callId: string } },
) {
  console.log('--- API Route /api/connect-group invoked ---');

  // Read agentUserId from request body (Implementation needed)
  let agentUserId = 'default-group-bot'; // Default ID
  try {
    const body = await req.json();
    if (
      body &&
      typeof body.agentUserId === 'string' &&
      body.agentUserId.trim() !== ''
    ) {
      agentUserId = body.agentUserId.trim();
      console.log(
        `API Route (connect-group): Received agentUserId from body: ${agentUserId}`,
      );
    } else {
      console.log(
        `API Route (connect-group): No valid agentUserId in body, using default: ${agentUserId}`,
      );
    }
  } catch (error) {
    console.warn(
      'API Route (connect-group): Could not parse request body for agentUserId, using default.',
      error,
    );
  }

  // --- Env Var Checks (Keep as is) ---
  if (!streamApiKey || !streamApiSecret || !openAiApiKey) {
    return NextResponse.json(
      {
        error:
          'Missing Stream/OpenAI API Key or Secret in environment variables',
      },
      { status: 500 },
    );
  }

  const { callType, callId } = params;

  if (!callType || !callId) {
    return NextResponse.json(
      { error: 'Missing callType or callId in route parameters' },
      { status: 400 },
    );
  }

  console.log(
    `API Route (connect-group): request for callType=${callType}, callId=${callId}, agentUserId=${agentUserId}`,
  );

  try {
    const streamClient = new StreamClient(streamApiKey, streamApiSecret);
    const call = streamClient.video.call(callType, callId);

    console.log(
      `API Route (connect-group): Attempting to connect agent (${agentUserId})...`,
    );

    // Use the agentUserId read from the body (or default)
    const realtimeClient = await streamClient.video.connectOpenAi({
      call,
      openAiApiKey,
      agentUserId: agentUserId,
    });

    console.log(
      `API Route (connect-group): Agent (${agentUserId}) connected, setting up realtime client...`,
    );
    // Pass agentUserId to setup function for potential use in prompt/logging
    await setupRealtimeClient(realtimeClient, agentUserId);

    console.log(
      `API Route (connect-group): Agent (${agentUserId}) connection process complete.`,
    );
    return NextResponse.json({ ok: true, agentUserId: agentUserId }); // Return the ID used
  } catch (error) {
    console.error(
      `API Route (connect-group) Error connecting agent (${agentUserId}):`,
      error,
    );
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to connect agent';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
