'use client';
import { useState, useEffect } from 'react';
import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Users, LayoutList, Bot } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Loader from './Loader';
import EndCallButton from './EndCallButton';
import { cn } from '@/lib/utils';

// Helper function to get cookies (copied from StreamClientProvider)
const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
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

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const MeetingRoom = () => {
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');
  const router = useRouter();
  const { id } = useParams();
  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const [isAgentAdding, setIsAgentAdding] = useState(false);
  const [canAddBot, setCanAddBot] = useState(false);
  const { useCallCallingState } = useCallStateHooks();

  // for more detail about types of CallingState see: https://getstream.io/video/docs/react/ui-cookbook/ringing-call/#incoming-call-panel
  const callingState = useCallCallingState();

  // Effect to check email permission on component mount and update
  useEffect(() => {
    const checkPermission = () => {
      const userEmail = getCookie('user_email_manual');
      const allowedEmail = process.env.NEXT_PUBLIC_ALLOWED_EMAIL;
      console.log('Checking permission:', { userEmail, allowedEmail });
      setCanAddBot(!!userEmail && !!allowedEmail && userEmail === allowedEmail);
    };

    checkPermission();

    // Optional: Re-check if cookie might change dynamically (e.g., user logs out/in in another tab)
    // This might be overkill for a demo
    // const interval = setInterval(checkPermission, 5000); // Check every 5 seconds
    // return () => clearInterval(interval);

  }, []); // Run only once on mount, or add dependencies if needed

  if (callingState !== CallingState.JOINED) return <Loader />;

  const CallLayout = () => {
    switch (layout) {
      case 'grid':
        return <PaginatedGridLayout />;
      case 'speaker-right':
        return <SpeakerLayout participantsBarPosition="left" />;
      default:
        return <SpeakerLayout participantsBarPosition="right" />;
    }
  };

  // Function to handle adding the AI agent
  const handleAddAgent = async () => {
    if (!id) {
      console.error("Meeting ID is missing");
      // Optionally show a toast/alert here
      return;
    }
    setIsAgentAdding(true);
    console.log(`Attempting to add agent to call: ${id}`);

    try {
      // Fetch the new Next.js API route
      const response = await fetch(`/api/connect/default/${id}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to add agent: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Agent added successfully:", result);
      // Optionally show a success toast/alert here
      // Maybe disable button permanently after success? setIsAgentAdding(true) permanently?
    } catch (error) {
      console.error("Error adding agent:", error);
      // Optionally show an error toast/alert here
    } finally {
      // Re-enable button even if error occurred, allowing retry
      // If you want to disable permanently on success, adjust logic above
      setIsAgentAdding(false);
    }
  };

  return (
    <section className="relative h-screen w-full overflow-hidden pt-4 text-white">
      <div className="relative flex size-full items-center justify-center">
        <div className=" flex size-full max-w-[1000px] items-center">
          <CallLayout />
        </div>
        <div
          className={cn('h-[calc(100vh-86px)] hidden ml-2', {
            'show-block': showParticipants,
          })}
        >
          <CallParticipantsList onClose={() => setShowParticipants(false)} />
        </div>
      </div>
      {/* video layout and call controls */}
      <div className="fixed bottom-0 flex w-full items-center justify-center gap-5 flex-wrap">
        <CallControls onLeave={() => router.push(`/`)} />

        <DropdownMenu>
          <div className="flex items-center">
            <DropdownMenuTrigger className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]  ">
              <LayoutList size={20} className="text-white" />
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent className="border-dark-1 bg-dark-1 text-white">
            {['Grid', 'Speaker-Left', 'Speaker-Right'].map((item, index) => (
              <div key={index}>
                <DropdownMenuItem
                  onClick={() =>
                    setLayout(item.toLowerCase() as CallLayoutType)
                  }
                >
                  {item}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="border-dark-1" />
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <CallStatsButton />
        <button onClick={() => setShowParticipants((prev) => !prev)}>
          <div className=" cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]  ">
            <Users size={20} className="text-white" />
          </div>
        </button>
        {/* Conditionally render Add AI Agent Button */}
        {canAddBot && (
          <button
            onClick={handleAddAgent}
            disabled={isAgentAdding}
            className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add AI Agent"
          >
            <Bot size={20} className="text-white" />
          </button>
        )}
        {!isPersonalRoom && <EndCallButton />}
      </div>
    </section>
  );
};

export default MeetingRoom;
