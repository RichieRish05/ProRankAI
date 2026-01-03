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
  setUser: (user: User | null) => void;
  logout: () => void;
  fetchUser: () => Promise<boolean>;
  isInitializing: boolean;
  setIsInitializing: (isInitializing: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitializing: true,
  setUser: (user) =>
    set({
      user,
    }),

  fetchUser: async (): Promise<boolean> => {
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
        set({ user: data });
        return true;
      } else {
        // 401 or other error status means not authenticated
        set({ user: null });
        return false;
      }
    } catch (error) {
      console.error("Error during fetchUser:", error);
      set({ user: null });
      return false;
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
      isInitializing: false
    });
    redirect("/");
  },

  setIsInitializing: (isInitializing: boolean) => set({ isInitializing }),
}));
