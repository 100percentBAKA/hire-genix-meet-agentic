import { StreamClient } from '@stream-io/node-sdk';
import { NextResponse } from 'next/server';

// Ensure environment variables are loaded
const streamApiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const streamApiSecret = process.env.STREAM_API_SECRET;
const openAiApiKey = process.env.OPENAI_API_KEY;

// Helper function (copied from server.mjs)
async function setupRealtimeClient(realtimeClient: any) {
  realtimeClient.on('error', (event: any) => {
    console.error('Realtime Client Error:', event);
  });

  realtimeClient.on('session.update', (event: any) => {
    console.log('Realtime session update:', event);
  });

  // Updated instructions for the AI Interviewer
  realtimeClient.updateSession({
    instructions: `**Persona:** You are HireGenie, an AI technical interviewer representing Hire-Genix Meet. You are conducting a *brief introductory technical screening* for a Junior Software Engineer role. Your tone should be professional, friendly, and conversational.

**Goal:** Evaluate the candidate's basic technical understanding and problem-solving ability based on their profile and responses. Keep the interview concise (around 3 main technical questions plus follow-ups) for this demonstration.

**Candidate Profile (Dummy):**
*   **Name:** Alex Chen
*   **Applying for:** Junior Software Engineer
*   **Key Skills:** React, Node.js, Python, Basic SQL
*   **Experience:** 1-year internship at TechCorp (built internal tools using React/Node).
*   **Project:** Personal portfolio website using Next.js.
*   **Education:** B.S. Computer Science

**Interview Flow & Instructions:**

1.  **Introduction:** Start by briefly introducing yourself ("Hi, I'm HireGenie, an AI interviewer from Hire-Genix Meet...") and mention the purpose ("...just a short technical discussion based on your profile.").
2.  **Questioning - CRITICAL:**
    *   Ask **one question at a time**. Wait for the candidate's complete response before asking the next question or a follow-up.
    *   Ask approximately **3 main technical questions** suitable for a Junior SWE role, touching upon fundamental concepts or technologies from the profile (React, Node.js, basic algorithms/data structures, SQL).
    *   **Resume Integration:** Ask at least *one* question directly referencing the candidate's profile (e.g., "I see you worked with React during your internship at TechCorp, could you tell me about...?").
    *   **Follow-up/Counter-Questions:** This is key. Based *directly* on the candidate's response to your main question, ask a relevant follow-up question to clarify, probe deeper, or assess their understanding more thoroughly. For example:
        *   If they explain a concept: "Could you elaborate on [specific part]?" or "What are the trade-offs of that approach?"
        *   If they describe a project: "What was the biggest challenge you faced there?" or "How did you handle [specific technical aspect]?"
        *   If their answer is vague: "Can you give me a specific example?"
    *   **DO NOT** just move mechanically through a pre-set list. The follow-ups based on their *actual answers* are crucial.
3.  **Conclusion:** After the main questions and follow-ups (around 3 cycles), politely conclude the technical portion of the interview (e.g., "Okay, that covers the main technical points I wanted to discuss. Thanks, Alex.").

**Example Areas for Main Questions (Don't ask all, pick ~3):**
*   A basic React concept (e.g., state vs props, component lifecycle, hooks).
*   A fundamental Node.js concept (e.g., event loop, async operations).
*   A simple data structure or algorithm question (e.g., explain hashing, how would you reverse a string).
*   A question related to their internship or portfolio project from the resume.
*   A basic SQL query concept.`,
  });

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
      console.log('Tool: get_weather request', { city, country, units });
      try {
        // This is a placeholder for actual weather API implementation
        // In a real implementation, you would call a weather API service here
        const weatherData = {
          location: country ? `${city}, ${country}` : city,
          temperature: 22,
          units: units === 'imperial' ? '°F' : '°C',
          condition: 'Partly Cloudy',
          humidity: 65,
          windSpeed: 10,
        };
        console.log('Tool: get_weather response', weatherData);
        return weatherData;
      } catch (error) {
        console.error('Tool: Error fetching weather data:', error);
        return { error: 'Failed to retrieve weather information' };
      }
    },
  );

  console.log(
    'Realtime client setup complete with AI Interviewer instructions.',
  );
  return realtimeClient;
}

// POST handler for the connect route
export async function POST(
  req: Request, // req is not used here, but it's part of the signature
  { params }: { params: { callType: string; callId: string } },
) {
  // --- TEMPORARY DEBUG LOGGING --- START
  console.log('--- API Route /api/connect invoked ---');
  console.log('Attempting to read env vars:');
  console.log(
    `NEXT_PUBLIC_STREAM_API_KEY: ${process.env.NEXT_PUBLIC_STREAM_API_KEY ? 'Loaded' : 'MISSING'}`,
  );
  console.log(
    `STREAM_API_SECRET: ${process.env.STREAM_API_SECRET ? 'Loaded' : 'MISSING'}`,
  );
  console.log(
    `OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Loaded' : 'MISSING'}`,
  );
  // --- TEMPORARY DEBUG LOGGING --- END

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
    `API Route: got a request for connect: callType=${callType}, callId=${callId}`,
  );

  try {
    const streamClient = new StreamClient(streamApiKey, streamApiSecret);
    const call = streamClient.video.call(callType, callId);

    // --- Added Step: Fetch and Log Call State ---
    console.log('API Route: Fetching current call state...');
    const callStateResponse = await call.get();
    if (callStateResponse?.call) {
      console.log(
        'API Route: Current Call State:',
        JSON.stringify(callStateResponse.call, null, 2),
      );
      console.log(
        'API Route: Current Call Members:',
        JSON.stringify(callStateResponse.members, null, 2),
      );
    } else {
      console.log('API Route: Failed to fetch call state details.');
    }
    // --- End Added Step ---

    console.log('API Route: Attempting to connect OpenAI agent...');

    const realtimeClient = await streamClient.video.connectOpenAi({
      call,
      openAiApiKey,
      agentUserId: 'lucy', // Keep agent ID consistent
    });

    console.log(
      'API Route: OpenAI agent connected, setting up realtime client...',
    );
    await setupRealtimeClient(realtimeClient);

    console.log('API Route: Agent connection process complete.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('API Route Error connecting agent:', error);
    // Provide more specific error if possible
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to connect agent';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
