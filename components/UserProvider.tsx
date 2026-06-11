"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

interface UserContextValue {
  user: User | null;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  refresh: async () => {},
  setUser: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export default function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { user: u } = await api<{ user: User }>("/api/auth/me");
      setUser(u);
    } catch {
      // 401 handled by api() redirect
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <UserContext.Provider value={{ user, refresh, setUser }}>{children}</UserContext.Provider>;
}
