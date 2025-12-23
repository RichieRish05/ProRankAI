"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Folder, FileText, Loader2 } from "lucide-react";
import { useAuthStore } from "@/app/store/useAuthStore";

interface DriveFolder {
  id: string;
  name: string;
}

export default function NewJobPage() {
  const router = useRouter();
  const { isAuthenticated, isInitializing, fetchUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(
    null,
  );
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(
    null,
  );
  const [jobName, setJobName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [driveFolders, setDriveFolders] = useState<any[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize auth on mount
  useEffect(() => {
    const initialize = async () => {
      await fetchUser();
      fetchDriveFiles(true);
    };
    initialize();
  }, [fetchUser]);

  // Redirect if not authenticated after initialization
  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push("/");
    }
  }, [isInitializing, isAuthenticated, router]);

  const fetchDriveFiles = async (
    fromBeginning: boolean = false,
    pageSize: number = 50,
  ) => {
    setIsLoading(true);
    const params = new URLSearchParams({ page_size: pageSize.toString() });

    if (fromBeginning) {
      setNextPageToken(null);
    } else if (nextPageToken) {
      params.append("next_page_token", nextPageToken);
    }
  
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/oauth/drive-files?${params.toString()}`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch drive files");
      }
      const data = await response.json();
      setDriveFolders(data.files || []);
      setNextPageToken(data.nextPageToken || null);
    } catch (error) {
      console.error("Error fetching drive files:", error);
      setDriveFolders([]);
      setNextPageToken(null);
    } finally {
      setIsLoading(false);
    }
  };


  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate job creation
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/job/start-job`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            folder_id: selectedFolder?.id,
            folder_name: selectedFolderName,
            name: jobName || "Untitled Job",
          }),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to start job");
      }
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error starting job:", error);
    }

    router.push("/");
  };

  const handleFolderClick = (folder: DriveFolder) => {
    setSelectedFolder(folder);
    setSelectedFolderName(folder.name);
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-8">
        <div className="mx-auto max-w-4xl">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="text-muted-foreground"
              >
                Jobs
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">New Review Job</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Create Resume Review Job
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Select a folder from your Google Drive and configure your resume
              review job
            </p>
          </div>

          {/* Step Indicator */}
          <div className="mb-8 flex items-center justify-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step >= 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              1
            </div>
            <div
              className={`h-0.5 w-16 ${step >= 2 ? "bg-primary" : "bg-muted"}`}
            />
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step >= 2
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <div
              className={`h-0.5 w-16 ${step >= 3 ? "bg-primary" : "bg-muted"}`}
            />
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step >= 3
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              3
            </div>
          </div>

          {/* Step 1: Select Folder */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Google Drive Folder</CardTitle>
                <CardDescription>
                  Choose a folder containing PDF resumes to review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={"grid grid-cols-2 gap-4 h-96 overflow-y-auto"}>
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center col-span-2">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-medium text-muted-foreground">
                        Loading folders...
                      </p>
                    </div>
                  ) : (
                    driveFolders.length > 0 && driveFolders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => handleFolderClick(folder)}
                        className={`flex w-full min-h-20 items-center justify-between rounded-lg border p-4 text-left hover:bg-accent ${
                          selectedFolder?.id === folder.id
                            ? "border-primary bg-accent"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Folder className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{folder.name}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <div className="mt-6 flex justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        fetchDriveFiles(true);
                      }}
                      disabled={isLoading}
                    >
                      First Page
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => fetchDriveFiles()}
                      disabled={isLoading}
                    >
                      Next Page
                    </Button>
                  </div>
                  <Button onClick={() => setStep(2)} disabled={!selectedFolder}>
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Job Details */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
                <CardDescription>
                  Name your job
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="jobName">Job Name</Label>
                  <Input
                    id="jobName"
                    placeholder="e.g., Fall 2024 Internship Applicants"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                  />
                </div>
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!jobName.trim()}>
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review & Start */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Start Job</CardTitle>
                <CardDescription>
                  Review your settings and start the resume review process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 rounded-lg border border-border bg-muted/50 p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Selected Folder
                      </p>
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{selectedFolder?.name}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(1)}
                    >
                      Change
                    </Button>
                  </div>
                  <div className="flex items-start justify-between border-t border-border pt-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Job Name
                      </p>
                      <p className="font-medium">{jobName}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(2)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting Job...
                      </>
                    ) : (
                      "Start Review Job"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
