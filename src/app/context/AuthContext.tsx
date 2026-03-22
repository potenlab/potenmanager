import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient, Session, User } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Singleton Supabase client — PKCE flow to avoid Site URL fallback
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 기존 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // 세션 변화 리스닝
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try { localStorage.removeItem('poten_demo_mode'); localStorage.removeItem('poten_active_org_id'); } catch {}
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, needsConfirmation: false };
    // If user is created but session is null, email confirmation is required
    const needsConfirmation = !data.session;
    return { error: null, needsConfirmation };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    try {
      localStorage.removeItem('poten_active_org_id');
      localStorage.removeItem('poten_demo_mode');
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        signInWithGoogle,
        signInWithEmail,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}