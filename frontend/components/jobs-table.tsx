"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpDown, Loader2 } from "lucide-react"
import { useEffect } from "react"
import { useAuthStore } from "@/app/store/useAuthStore"
import { useRouter } from "next/navigation"

interface Job {
  id: string
  name: string
  folder_name: string
  resume_count: number
  status: "queued" | "processing" | "completed" | "failed"
  created_at: string
}




export function JobsTable() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { isAuthenticated, isInitializing } = useAuthStore()



  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/query/get-jobs`, {
          credentials: 'include',
        })
        const data = await response.json()
        setJobs(data)
      } catch (error) {
        console.error('Error fetching jobs:', error)
        setJobs([])
        setIsLoading(false)
      } finally {
        setIsLoading(false)
      }
    }
    fetchJobs()
  }, [])


  const getStatusBadge = (status: Job["status"]) => {
    const variants = {
      queued: "secondary",
      pending: "default",
      completed: "outline",
      failed: "destructive",
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants]} className="capitalize">
        {status}
      </Badge>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>
              <Button variant="ghost" size="sm" className="-ml-3 h-8 font-medium">
                Job Name
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" className="-ml-3 h-8 font-medium">
                Folder Name
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" className="-ml-3 h-8 font-medium">
                Created
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
          <TableBody>
          {jobs.length > 0 && jobs.map((job) => (
            <TableRow key={job.id} className="cursor-pointer">
              <TableCell className="font-medium">
                <Link href={`/jobs/${job.id}`} className="hover:underline">
                  {job.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{job.folder_name}</TableCell>
              <TableCell>{getStatusBadge(job.status)}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(job.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
            </TableRow>
          ))}
          </TableBody>
      </Table>
    </div>
)}
