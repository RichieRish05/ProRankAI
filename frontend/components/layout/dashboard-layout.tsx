"use client";

import type React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useAuthStore } from "@/app/store/useAuthStore";
import { useRouter } from "next/navigation";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isInitializing, logout, setIsInitializing } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    setIsInitializing(true);
    setTimeout(async () => {
      await logout();
    }, 1000);
  };

  const handleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/oauth/authorize`;
  };


  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">ProRank</span>
          </Link>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors"
          >
            <FileText className="h-4 w-4" />
            Jobs
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Resume Review Jobs
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {!isInitializing && user === null ? (
              <Button variant="outline" size="sm" onClick={handleLogin}>
                Login
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log Out
              </Button>
            )}
            {!isInitializing && user !== null ? (
              <img
                src={user?.picture}
                alt="User Profile Picture"
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted" />
            )}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
