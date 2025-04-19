import { StreamClient } from '@stream-io/node-sdk';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Ensure environment variables are loaded (Next.js automatically loads .env.local)
const streamApiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY; // Use NEXT_PUBLIC_ prefix if needed in client-side, otherwise keep as STREAM_API_KEY
const streamApiSecret = process.env.STREAM_API_SECRET;

export async function GET() {
  if (!streamApiKey || !streamApiSecret) {
    return NextResponse.json(
      { error: 'Missing Stream API Key or Secret in environment variables' },
      { status: 500 },
    );
  }

  try {
    // No need to create a new client for every request if it's stateless
    // Consider creating the client outside the handler if performance is critical
    // However, for simplicity and ensuring env vars are read per request:
    const streamClient = new StreamClient(streamApiKey, streamApiSecret);

    console.log('API Route: got a request for credentials');

    // Generate a shorter UUID for callId (first 12 chars)
    const callId = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    // Generate a shorter UUID for userId (first 8 chars with prefix)
    // We need a user ID for the token, can be dynamic or static depending on auth
    // Assuming a generic user for now, replace with actual user logic if needed
    const userId = `guest-${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`;
    const callType = 'default'; // Or read from request if needed

    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // Token valid for 1 hour
    const issuedAt = Math.floor(Date.now() / 1000) - 60; // Issued 60 seconds ago

    const token = streamClient.createToken(userId, expirationTime, issuedAt);

    console.log(
      `API Route: Generated token for userId: ${userId}, callId: ${callId}`,
    );

    return NextResponse.json({
      apiKey: streamApiKey, // Be cautious exposing API key directly to client if not using NEXT_PUBLIC_
      token,
      callType,
      callId,
      userId, // Send back the generated guest userId
    });
  } catch (error) {
    console.error('API Route Error generating credentials:', error);
    return NextResponse.json(
      { error: 'Failed to generate credentials' },
      { status: 500 },
    );
  }
}
