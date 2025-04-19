'use client';

import { ReactNode, useEffect, useState } from 'react';
import { StreamVideoClient, StreamVideo } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';

import { tokenProvider } from '@/actions/stream.actions';
import Loader from '@/components/Loader';

// Helper function to set cookies (ensure this runs client-side)
const setCookie = (name: string, value: string, days: number) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  // Check if running in browser before accessing document
  if (typeof window !== 'undefined') {
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  }
};

// Helper function to get cookies (ensure this runs client-side)
const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') {
    return null; // Cannot access document on server
  }
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;

const StreamVideoProvider = ({ children }: { children: ReactNode }) => {
  const [videoClient, setVideoClient] = useState<StreamVideoClient>();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (!API_KEY) throw new Error('Stream API key is missing');

    const client = new StreamVideoClient({
      apiKey: API_KEY,
      user: {
        id: user?.id,
        name: user?.username || user?.id,
        image: user?.imageUrl,
      },
      tokenProvider,
    });

    setVideoClient(client);
  }, [user, isLoaded]);

  // New useEffect specifically for setting the user email cookie
  useEffect(() => {
    // Check if user is loaded, exists, and has a primary email address string
    if (isLoaded && user && user.primaryEmailAddress?.emailAddress) {
      const currentCookieEmail = getCookie('user_email_manual');
      const userEmail = user.primaryEmailAddress.emailAddress; // Get the actual email string

      // Only set the cookie if it's not already set or needs updating
      if (userEmail !== currentCookieEmail) {
        console.log('Setting user_email_manual cookie:', userEmail);
        setCookie('user_email_manual', userEmail, 7); // Set the string email
      }
    } else if (!user) {
      // Optional: Clear the cookie if the user logs out
      // Note: This depends on how Clerk state updates on logout
      // It might be better handled by middleware if needed consistently
      const currentCookieEmail = getCookie('user_email_manual');
      if (currentCookieEmail) {
        console.log('Clearing user_email_manual cookie');
        setCookie('user_email_manual', '', -1); // Expire the cookie
      }
    }
  }, [user, isLoaded]); // Re-run when user or loading state changes

  if (!videoClient) return <Loader />;

  return <StreamVideo client={videoClient}>{children}</StreamVideo>;
};

export default StreamVideoProvider;
