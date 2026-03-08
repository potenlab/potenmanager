import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from "react";
import { api } from "../../lib/api";
import { useTeam } from "./TeamContext";

export interface ActionItem {
  id: string;
  title: string;
  assigneeId?: string;
  done: boolean;
  linkedTaskId?: string;
  category?: import("../../lib/mockData").TaskCategory;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  location?: string;
  type: 'standup' | 'planning' | 'review' | 'brainstorm' | 'external' | 'other';
  status: 'scheduled' | 'completed' | 'cancelled';
  attendeeIds: string[];
  organizerId: string;
  notes?: string;
  actionItems: ActionItem[];
  createdAt: string;
  updatedAt: string;
}

interface MeetingContextType {
  meetings: Meeting[];
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  removeMeeting: (id: string) => void;
  getMeeting: (id: string) => Meeting | undefined;
  fetchMeetingById: (id: string) => Promise<Meeting | null>;
  isLoading: boolean;
  isSynced: boolean;
}

const defaultValue: MeetingContextType = {
  meetings: [],
  addMeeting: () => {},
  updateMeeting: () => {},
  removeMeeting: () => {},
  getMeeting: () => undefined,
  fetchMeetingById: async () => null,
  isLoading: true,
  isSynced: false,
};

const MeetingContext = createContext<MeetingContextType>(defaultValue);

export function MeetingProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useTeam();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        const serverMeetings = await api.getMeetings();
        if (serverMeetings && serverMeetings.length > 0) {
          setMeetings(serverMeetings as Meeting[]);
        }
        setIsSynced(true);
      } catch (err) {
        console.error("[MeetingContext] Server sync failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const syncToServer = useCallback(async (
    action: 'create' | 'update' | 'delete',
    idOrMeeting: any,
    updates?: any,
  ) => {
    const attempt = async (retries: number): Promise<boolean> => {
      try {
        switch (action) {
          case 'create': await api.createMeeting(idOrMeeting); break;
          case 'update':
            // Send full meeting data (not just partial updates) to ensure KV merge works
            const full = (() => {
              const current = idOrMeeting;
              const m = updates;
              // idOrMeeting is the meeting ID for updates
              return m;
            })();
            await api.updateMeeting(idOrMeeting, full);
            break;
          case 'delete': await api.deleteMeeting(idOrMeeting); break;
        }
        return true;
      } catch (err) {
        if (retries > 0) {
          console.warn(`[MeetingContext] Sync retry (${action}, ${retries} left):`, err);
          await new Promise(r => setTimeout(r, 1000));
          return attempt(retries - 1);
        }
        console.error(`[MeetingContext] Sync failed after retries (${action}):`, err);
        return false;
      }
    };

    const success = await attempt(2);
    if (!success) {
      console.warn("[MeetingContext] Sync failed, NOT restoring from server to preserve local edits.");
    }
  }, []);

  const addMeeting = useCallback((meeting: Meeting) => {
    setMeetings((prev) => [...prev, meeting]);
    syncToServer('create', meeting);
  }, [syncToServer]);

  const updateMeeting = useCallback((id: string, updates: Partial<Meeting>) => {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m)));
    syncToServer('update', id, updates);
  }, [syncToServer]);

  const removeMeeting = useCallback((id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    syncToServer('delete', id);
  }, [syncToServer]);

  const getMeeting = useCallback((id: string) => meetings.find((m) => m.id === id), [meetings]);

  // Fetch a single meeting from server if not in local state
  const fetchMeetingById = useCallback(async (id: string): Promise<Meeting | null> => {
    // Already in local state
    const local = meetings.find((m) => m.id === id);
    if (local) return local;

    try {
      const meeting = await api.getMeetingById(id);
      if (meeting) {
        // Add to local state so it's available for subsequent renders
        setMeetings((prev) => {
          if (prev.find((m) => m.id === id)) return prev;
          return [...prev, meeting as Meeting];
        });
        return meeting as Meeting;
      }
    } catch (err) {
      console.error("[MeetingContext] Failed to fetch meeting by id:", err);
    }
    return null;
  }, [meetings]);

  const value = useMemo<MeetingContextType>(() => ({
    meetings, addMeeting, updateMeeting, removeMeeting, getMeeting, fetchMeetingById, isLoading, isSynced,
  }), [meetings, addMeeting, updateMeeting, removeMeeting, getMeeting, fetchMeetingById, isLoading, isSynced]);

  return (
    <MeetingContext.Provider value={value}>
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeetingContext() {
  return useContext(MeetingContext);
}
