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

  realtimeClient.updateSession({
    instructions:
      'You are a helpful assistant that can answer questions and help with tasks.',
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

  console.log('Realtime client setup complete.');
  return realtimeClient;
}

// POST handler for the connect route
export async function POST(
  req: Request, // req is not used here, but it's part of the signature
  { params }: { params: { callType: string; callId: string } },
) {
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
