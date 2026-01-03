"use client"

import { useState } from "react"
import { Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"

type SchoolYear = "freshman" | "sophomore" | "junior" | "senior"
type Status = "passed" | "failed"

interface Filter {
  freshman: boolean
  sophomore: boolean
  junior: boolean
  senior: boolean
  passed: boolean
  failed: boolean
}

interface FilterDropdownProps {
  filter: Filter
  onFilterChange: (filter: Filter) => void
}

export function FilterDropdown({ filter, onFilterChange }: FilterDropdownProps) {
  const schoolYears: SchoolYear[] = ["freshman", "sophomore", "junior", "senior"]
  const statuses: Status[] = ["passed", "failed"]


  const handleFilterChange = (field: keyof Filter) => {
    onFilterChange({
        ...filter, 
        [field]: !filter[field]
    })
  }


  const clearFilters = () => {
    onFilterChange({
      freshman: false,
      sophomore: false,
      junior: false,
      senior: false,
      passed: false,
      failed: false,
    })
  }

  const activeFilterCount = Object.values(filter).filter(Boolean).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative bg-transparent">
          <Filter className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center justify-between">
          <DropdownMenuLabel>Filters</DropdownMenuLabel>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
              Clear
              <X className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        <div className="p-2">
          <div className="mb-4">
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">School Year</Label>
            <div className="space-y-2">
              {schoolYears.map((year) => (
                <div key={year} className="flex items-center space-x-2">
                  <Checkbox
                    id={year}
                    checked={filter[year as keyof Filter]}
                    onCheckedChange={() => handleFilterChange(year)}
                  />
                  <Label htmlFor={year} className="text-sm font-normal capitalize cursor-pointer">
                    {year}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <DropdownMenuSeparator className="my-2" />

          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Status</Label>
            <div className="space-y-2">
              {statuses.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={status}
                    checked={filter[status as keyof Filter]}
                    onCheckedChange={() => handleFilterChange(status)}
                  />
                  <Label htmlFor={status} className="text-sm font-normal capitalize cursor-pointer">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
