import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useConvex } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface AuthUser {
  _id: Id<"users">;
  name: string;
  email: string;
  authId: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = "restaurantos_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const convex = useConvex();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored auth on mount
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthUser;
        // Verify the user still exists
        convex.query(api.users.getCurrentUserById, { userId: parsed._id })
          .then((result) => {
            if (result) {
              setUser(parsed);
            } else {
              localStorage.removeItem(AUTH_STORAGE_KEY);
            }
          })
          .catch(() => {
            localStorage.removeItem(AUTH_STORAGE_KEY);
          })
          .finally(() => setIsLoading(false));
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [convex]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await convex.mutation(api.auth.signIn, { email, password });
    const userData: AuthUser = {
      _id: result.userId,
      name: result.name,
      email: result.email,
      authId: result.authId,
    };
    setUser(userData);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
  }, [convex]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await convex.mutation(api.auth.signUp, { email, password, name });
    const userData: AuthUser = {
      _id: result.userId,
      name,
      email,
      authId: result.authId,
    };
    setUser(userData);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
  }, [convex]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
