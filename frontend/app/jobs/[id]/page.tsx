"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronRight,
  Search,
  LucideUserSearch,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useAuthStore } from "@/app/store/useAuthStore";
import { useFilterStore } from "@/app/store/useFilterStore";
import { FilterDropdown } from "@/components/filter-dropdown";

interface Resume {
  id: number;
  created_at: string;
  job_id: number;
  score: number | null;
  gpa: number | null;
  num_internships: number | null;
  status: "scored" | "pending" | "failed";
  preview_url: string | null;
  candidate_name: string | null;
  google_id: string;
  text_url: string | null;
  view_url: string | null;
  school_year: string | null;
  file_name: string | null;
}

interface Stats {
  average_score: number;
  high_score: number;
  lowest_score: number;
  num_resumes: number;
}

interface Filter {
  freshman: boolean
  sophomore: boolean
  junior: boolean
  senior: boolean
  passed: boolean
  failed: boolean
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [stats, setStats] = useState<Stats>({
    average_score: 0,
    high_score: 0,
    lowest_score: 0,
    num_resumes: 0,
  });
  const { isAuthenticated, fetchUser, isInitializing } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [jobName, setJobName] = useState("");
  const [jobDate, setJobDate] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filter, setFilter] = useFilterStore(Number(params.id));


  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFilter({
      freshman: false,
      sophomore: false,
      junior: false,
      senior: false,
      passed: false,
      failed: false,
    });
    await fetchResumes();
    setIsRefreshing(false);
  };

  const fetchResumes = async (filters: Filter | null = null) => {
    try {

      let queryString = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/query/get-resumes?job_id=${params.id}`;
      
      if (filters) {
        setIsFiltering(true);
        const checkedFilters = Object.entries(filters).filter(([_, value]) => value);
        if (checkedFilters.length > 0){
          const filterString = checkedFilters.map(([key, value]) => `${key}=${value}`).join("&");
          queryString += `&${filterString}`;
        }
      }

      const response = await fetch(queryString, {
        credentials: "include",
      });
      if (!response.ok) {
        setResumes([]);
        return;
      }
      const data = await response.json();
      setResumes(data.resumes);
      setStats(data.stats);
      setJobName(data.job_name);
      setJobDate(
        data.job_date
          ? new Date(data.job_date).toLocaleDateString()
          : "Unknown Date",
      );
    } finally {
      setIsLoading(false);
      setIsFiltering(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await fetchUser();
      fetchResumes(filter);
    };
    initialize();
  }, []);


  if (isInitializing || isLoading || (!isInitializing && !isAuthenticated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const filteredResumes = resumes.filter(
    (resume) =>
      resume.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ??
      false,
  );

  const getScoreIndicator = (score: number) => {
    if (score >= 85)
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-3 w-3" />
        </div>
      );
    if (score >= 70)
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <Minus className="h-3 w-3" />
        </div>
      );
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingDown className="h-3 w-3" />
      </div>
    );
  };

  const getStatusBadge = (status: "scored" | "pending" | "failed") => {
    if (status === "scored") return <Badge variant="default">Scored</Badge>;
    if (status === "pending") return <Badge variant="outline">Pending</Badge>;
    if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <DashboardLayout>
      <main className="p-8">
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center justify-between">
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
              {jobName ? (
                <span className="text-sm font-medium">{jobName}</span>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">
                  Loading...
                </span>
              )}
            </div>
          </div>

          {/* Job Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                {jobName ? (
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {jobName}
                  </h1>
                ) : (
                  <h1 className="text-3xl font-semibold tracking-tight animate-pulse text-muted-foreground">
                    Loading...
                  </h1>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    Applications
                  </span>
                  <span className="text-sm text-muted-foreground">•</span>
                  {jobDate ? (
                    <span className="text-sm text-muted-foreground">
                      {jobDate}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground animate-pulse">
                      Getting Date...
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Button
                  variant="outline"
                  disabled={isRefreshing || isInitializing || !isAuthenticated}
                  size="sm"
                  onClick={handleRefresh}
                >
                  {isRefreshing ? (
                    <Loader2 className="mr-2 animate-spin" />
                  ) : (
                    <RefreshCcw className="mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-0">
                <CardDescription>Total Resumes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {stats.num_resumes}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-0">
                <CardDescription>Average Score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {stats.average_score}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-0">
                <CardDescription>Top Score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{stats.high_score}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-0">
                <CardDescription>Lowest Score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {stats.lowest_score}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resume Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resume Analysis</CardTitle>
                  <CardDescription className="mt-1.5">
                    Detailed breakdown of each candidate's evaluation
                  </CardDescription>
                </div>
                <div className="flex flex-row items-center gap-2">
                  <div className="relative w-64 ">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search candidates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <FilterDropdown filter={filter} onFilterChange={setFilter} />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      fetchResumes(filter);
                    }}
                    className="bg-transparent"
                  >
                    {isFiltering ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LucideUserSearch className="h-4 w-4" />
                    )}
                  </Button>
                  </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Candidate</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>GPA</TableHead>
                      <TableHead>Number of Internships</TableHead>
                      <TableHead>School Year</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResumes.length > 0 ? (
                      filteredResumes.map((resume) => (
                        <TableRow key={resume.id} className="cursor-pointer">
                          <TableCell className="font-medium">
                            <Link
                              href={`/jobs/${params.id}/resumes/${resume.id}`}
                              className="hover:underline"
                            >
                              {resume.file_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold">
                                {resume.score}
                              </span>
                              {getScoreIndicator(resume.score ?? 0)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {resume.gpa?.toFixed(2) ?? "N/A"}
                          </TableCell>
                          <TableCell>
                            {resume.num_internships ?? "N/A"}
                          </TableCell>
                          <TableCell>
                            {resume.school_year ?? "Unknown"}
                          </TableCell>
                          <TableCell>{getStatusBadge(resume.status)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No candidates found matching "{searchQuery}"
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </DashboardLayout>
  );
}
