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
  useCall,
} from '@stream-io/video-react-sdk';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Users, LayoutList, Bot, UserPlus } from 'lucide-react';

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
import { useToast } from "@/components/ui/use-toast";

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
  const [isAddingGroupBot, setIsAddingGroupBot] = useState(false);
  const { useCallCallingState } = useCallStateHooks();
  const call = useCall();
  const { toast } = useToast();

  // Determine if this is a group discussion meeting (with type assertion)
  const customData = call && typeof (call as any).custom === 'object' && (call as any).custom !== null
    ? (call as any).custom
    : undefined;
  const isGroupDiscussionCall = customData?.isGroupDiscussion === true;

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

  // Handler for adding Group Discussion Participant bot
  const handleAddGroupParticipant = async () => {
    if (!id) {
      console.error("Meeting ID is missing");
      toast({
        title: "Error",
        description: "Cannot add bot, meeting ID missing.",
        variant: "destructive"
      });
      return;
    }
    setIsAddingGroupBot(true);
    const agentUserId = `group-bot-${Math.random().toString(16).substring(2, 8)}`;

    try {
      console.log(`Attempting to add group participant bot ${agentUserId} to meeting ${id}`);
      const response = await fetch(`/api/connect-group/default/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentUserId: agentUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add group bot: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Group participant bot added successfully:", result);
      toast({
        title: "Success",
        description: `Participant Bot (${result.agentUserId}) added.`,
      });
      // No need to close modal as there isn't one here
    } catch (error) {
      console.error("Error adding group participant bot:", error);
      toast({
        title: "Error Adding Bot",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsAddingGroupBot(false);
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
        {/* Conditionally render Add AI Agent (Interviewer) Button */}
        {canAddBot && (
          <button
            onClick={handleAddAgent}
            disabled={isAgentAdding}
            className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add AI Interviewer Agent"
          >
            <Bot size={20} className="text-white" />
          </button>
        )}
        {/* Conditionally render Add Group Discussion Participant Button */}
        {isGroupDiscussionCall && (
          <button
            onClick={handleAddGroupParticipant}
            disabled={isAddingGroupBot}
            className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add AI Discussion Participant"
          >
            <UserPlus size={20} className="text-white" />
          </button>
        )}
        {!isPersonalRoom && <EndCallButton />}
      </div>
    </section>
  );
};

export default MeetingRoom;
