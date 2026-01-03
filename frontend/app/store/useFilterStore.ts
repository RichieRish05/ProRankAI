import { useState, useEffect } from "react";


interface Filter {
    freshman: boolean
    sophomore: boolean
    junior: boolean
    senior: boolean
    passed: boolean
    failed: boolean
  }


const DEFAULT_FILTERS: Filter = {
    freshman: false,
    sophomore: false,
    junior: false,
    senior: false,
    passed: false,
    failed: false,
  }

export function useFilterStore(jobId: number) {
    const storageKey = `resumeFilters_${jobId}`;
  
    const [filters, setFilters] = useState<Filter>(() => {
      // Load from localStorage on initial render
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        return stored ? JSON.parse(stored) : DEFAULT_FILTERS;
      }
      return DEFAULT_FILTERS;
    });
  
    // Save to localStorage whenever filters change
    useEffect(() => {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    }, [filters, storageKey]);
  
    return [filters, setFilters] as const;
  }