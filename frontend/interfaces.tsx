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

