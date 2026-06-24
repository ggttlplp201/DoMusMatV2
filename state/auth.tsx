"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/auth/roles";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  company_name: string | null;
  country: string;
  phone: string | null;
  role: Role;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile(u: User | null) {
      if (!u) {
        if (active) setProfile(null);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      if (active) setProfile((data as Profile) ?? null);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const u = data.user ?? null;
      setUser(u);
      loadProfile(u).finally(() => {
        if (active) setLoading(false);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const u = session?.user ?? null;
      setUser(u);
      loadProfile(u);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, profile, role: profile?.role ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
