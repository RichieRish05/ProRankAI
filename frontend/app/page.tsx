"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { JobsTable } from "@/components/jobs-table";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";

export default function DashboardPage() {
  const { isInitializing, fetchUser, user, setIsInitializing } = useAuthStore();

  
  useEffect(() => {
    if (!isInitializing) {
      setIsInitializing(true);
    }
    const initialize = async () => {
      await fetchUser();
    };
    initialize();
  }, []);
  

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Manage and review resume screening jobs
          </p>
          <Button asChild>
            {user !== null ? (
              <Link href="/jobs/new">
                <Plus className="mr-2 h-4 w-4" />
                New Review Job
              </Link>
            ) : (
              <div>
                <Plus className="mr-2 h-4 w-4" />
                New Review Job
              </div>
            )}
          </Button>
        </div>
        <JobsTable />
      </main>
    </DashboardLayout>
  );
}

{
  /* <div className="flex min-h-[500px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <svg
                className="h-10 w-10 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                />
              </svg>
            </div>
            <h3 className="mt-6 text-xl font-semibold">No jobs yet</h3>
            <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
              Create your first resume review job by connecting your Google Drive and selecting a folder with resumes.
            </p>
            <Button asChild className="mt-6">
              <Link href="/jobs/new">
                <Plus className="mr-2 h-4 w-4" />
                Create your first review job
              </Link>
            </Button>
          </div> */
}
