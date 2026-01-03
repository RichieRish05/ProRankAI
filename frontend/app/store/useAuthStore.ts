"use client";

import { create } from "zustand";
import { redirect } from "next/navigation";

type User = {
  id: string;
  email: string;
  picture: string;
  created_at: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
  isInitializing: boolean;
  setIsInitializing: (isInitializing: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
    }),

  fetchUser: async () => {
    set({ isInitializing: true });
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/oauth/me`,
        {
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        set({ user: data, isAuthenticated: true });
      } else {
        // 401 or other error status means not authenticated
        set({ user: null, isAuthenticated: false });
      }
    } catch (error) {
      console.error("Error during fetchUser:", error);
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isInitializing: false });
    }
  },

  logout: async () => {
    // Clear the JWT token cookie by calling the backend logout endpoint
    set({ isInitializing: true });
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/oauth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error during logout:", error);
    }
    // Clear the in-memory state
    set({
      user: null,
      isAuthenticated: false,
      isInitializing: false
    });
    redirect("/");
  },

  setIsInitializing: (isInitializing: boolean) => set({ isInitializing }),
}));
