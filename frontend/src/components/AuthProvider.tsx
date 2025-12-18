"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Defer initial session check slightly to not block initial render
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session error:", error);
          // Clear potentially corrupted session data
          try {
            // Clear Supabase storage keys
            if (typeof window !== 'undefined') {
              const keys = Object.keys(localStorage);
              keys.forEach(key => {
                if (key.startsWith('sb-') || key.includes('supabase')) {
                  localStorage.removeItem(key);
                }
              });
            }
            await supabase.auth.signOut();
          } catch {
            // Ignore cleanup errors
          }
        }
        setUser(session?.user ?? null);
      } catch (err) {
        console.error("Auth initialization error:", err);
        // Clear corrupted session data on error
        try {
          // Clear Supabase storage keys
          if (typeof window !== 'undefined') {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
              if (key.startsWith('sb-') || key.includes('supabase')) {
                localStorage.removeItem(key);
              }
            });
          }
          await supabase.auth.signOut();
        } catch {
          // Ignore signOut errors
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Use setTimeout to defer this slightly and allow page to render first
    const timeoutId = setTimeout(initAuth, 0);

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        setUser(session?.user ?? null);

        // Redirect to home on sign out
        if (event === 'SIGNED_OUT') {
          window.location.href = "/";
        }
      } catch (err) {
        console.error("Auth state change error:", err);
        // Clear corrupted session on error
        setUser(null);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Don't need to redirect here - onAuthStateChange will handle it
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      loading: false,
      signOut: async () => {},
    };
  }
  return context;
}
