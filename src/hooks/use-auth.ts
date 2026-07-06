import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const AuthUserContext = createContext<User | null>(null);

export function useAuth() {
  const contextUser = useContext(AuthUserContext);
  const [user, setUser] = useState<User | null>(contextUser);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!contextUser);

  useEffect(() => {
    if (contextUser) {
      setUser(contextUser);
      setLoading(false);
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? contextUser ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? contextUser ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [contextUser]);

  return { user, session, loading };
}
