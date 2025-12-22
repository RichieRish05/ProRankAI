"use client"

import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ChevronRight, Download, FileText, CheckCircle2, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuthStore } from "@/app/store/useAuthStore"
import { GraduationCap, Briefcase, Calendar } from "lucide-react"

interface ScoreBreakdown {
  category: string
  score: number
  maxScore: number
}



interface ScoreBreakdown {
  gpa_contribution: number
  experience_contribution: number
  impact_quality_contribution: number
}

interface Resume {
  id: number
  created_at: string
  job_id: number
  score: number | null
  gpa: number | null
  num_internships: number | null
  status: "scored" | "pending" | "failed"
  candidate_name: string | null
  file_name: string
  google_id: string
  preview_url: string
  school_year: string | null
  text_url: string
  view_url: string
  gpa_contribution: number | null
  experience_contribution: number | null
  impact_quality_contribution: number | null
}

export default function ResumeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [resume, setResume] = useState<Resume | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { isAuthenticated, fetchUser, isInitializing} = useAuthStore()


  const fetchResume = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/query/get-resume?resume_id=${params.resumeId}`, {
        credentials: 'include',
      })
      if (!response.ok){
        setResume(null)
        throw new Error("Failed to fetch resume")
      }
      const data = await response.json()
      setResume(data)
    } catch (error) {
      setResume(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true)
      await fetchUser()
      fetchResume()
    }
    initialize()
  }, [])

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push("/")
    }
  }, [isInitializing, isAuthenticated, router])

  // Show loading state while initializing, loading data, or if not authenticated (to prevent flash before redirect)
  if (isInitializing || isLoading || (!isInitializing && !isAuthenticated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }


  const getSuggestions = (score: number) => {
    if (score >= 85)
      return "Excellent candidate - Highly recommended"
    if (score >= 70)
      return "Good candidate - Recommended"
    if (score >= 50)
      return "Average candidate - Considerable"
    return "Poor candidate - Not recommended"
  }


  return (
    <DashboardLayout>
      <main className="p-8">
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="text-muted-foreground">
              Jobs
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/jobs/${params.id}`)}
              className="text-muted-foreground"
            >
              Fall 2024 Internship Applicants
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{resume?.file_name}</span>
          </div>

          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
              <h1 className="text-3xl font-semibold tracking-tight">{resume?.file_name}</h1>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Resume Preview */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Resume Preview</CardTitle>
                </CardHeader>
                <CardContent>

                  <div className="aspect-[8.5/11] rounded-lg border border-border bg-muted/50 flex items-center justify-center">
                    {resume?.preview_url ? (
                    <iframe src={resume?.preview_url} className="w-full h-full" title="Resume Preview" />
                    ) : (
                      <div className="text-center">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">No preview available</p>
                      </div>
                    )}
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Right Column - Analysis */}
            <div className="space-y-6 lg:col-span-2">
              {/* Overall Score */}
              <Card>
                <CardHeader>
                  <CardTitle>Overall Score</CardTitle>
                  <CardDescription>Composite evaluation across all categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-3xl font-bold text-primary">{resume?.score}</span>
                    </div>
                    <div className="flex-1">
                      <Progress value={resume?.score} className="h-3" />
                      <p className="mt-2 text-sm text-muted-foreground">{getSuggestions(resume?.score ?? 0)}</p>
 
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* GPA */}
              <AcademicCard gpa={resume?.gpa ?? "N/A"} internships={resume?.num_internships ?? 0} schoolYear={resume?.school_year ?? "N/A"} />
              

              {/* Score Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Score Breakdown</CardTitle>
                  <CardDescription>Performance across evaluation categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">             
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{"GPA Contribution"}</span>
                        <span>
                          {resume?.gpa_contribution}/{40}
                        </span>
                      </div>
                      <Progress value={(resume?.gpa_contribution ?? 0)/40 * 100} className="h-2" />
                  </div>
                  <div className="space-y-4">             
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{"Experience Contribution"}</span>
                        <span>
                          {resume?.experience_contribution}/{40}
                        </span>
                      </div>
                      <Progress value={(resume?.experience_contribution ?? 0)/40 * 100} className="h-2" />
                  </div>
                  <div className="space-y-4">             
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{"Impact Quality Contribution"}</span>
                        <span>
                          {resume?.impact_quality_contribution}/{20}
                        </span>
                      </div>
                      <Progress value={(resume?.impact_quality_contribution ?? 0)/20* 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}



interface AcademicCardProps {
  gpa: number | string
  internships: number
  schoolYear: string
}

export function AcademicCard({ gpa, internships, schoolYear }: AcademicCardProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-8">
        <div className="space-y-6">
          {/* GPA Section */}
          <div className="flex items-center justify-between border-b-2 border-black pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-black p-3">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium uppercase tracking-wider text-black">GPA</span>
            </div>
            <span className="text-4xl font-bold text-black">{typeof gpa === "number" ? gpa.toFixed(2) : gpa}</span>
          </div>

          {/* Internships Section */}
          <div className="flex items-center justify-between border-b-2 border-black pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-black p-3">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium uppercase tracking-wider text-black">Internships</span>
            </div>
            <span className="text-4xl font-bold text-black">{internships}</span>
          </div>

          {/* School Year Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-black p-3">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium uppercase tracking-wider text-black">Year</span>
            </div>
            <span className="text-2xl font-bold text-black">{schoolYear}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
