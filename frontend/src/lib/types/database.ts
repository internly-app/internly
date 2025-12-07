/**
 * Database Types
 *
 * TypeScript types for Supabase tables matching schema.sql
 */

export type WorkStyle = "onsite" | "hybrid" | "remote";

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          website: string | null;
          industry: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          website?: string | null;
          industry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          website?: string | null;
          industry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          title: string;
          slug: string;
          company_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          company_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          company_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          role_id: string;
          location: string;
          term: string;
          duration_months: number | null;
          work_style: WorkStyle;
          team_name: string | null;
          technologies: string | null;
          hardest: string;
          best: string;
          advice: string | null;
          wage_hourly: number;
          wage_currency: string;
          housing_stipend_provided: boolean;
          housing_stipend: number | null;
          perks: string | null;
          interview_round_count: number;
          interview_rounds_description: string;
          interview_tips: string | null;
          like_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          role_id: string;
          location: string;
          term: string;
          duration_months?: number | null;
          work_style: WorkStyle;
          team_name?: string | null;
          technologies?: string | null;
          hardest: string;
          best: string;
          advice?: string | null;
          wage_hourly: number;
          wage_currency?: string;
          housing_stipend_provided?: boolean;
          housing_stipend?: number | null;
          perks?: string | null;
          interview_round_count: number;
          interview_rounds_description: string;
          interview_tips?: string | null;
          like_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string;
          role_id?: string;
          location?: string;
          term?: string;
          duration_months?: number | null;
          work_style?: WorkStyle;
          team_name?: string | null;
          technologies?: string | null;
          hardest?: string;
          best?: string;
          advice?: string;
          wage_hourly?: number;
          wage_currency?: string;
          housing_stipend_provided?: boolean;
          housing_stipend?: number | null;
          perks?: string | null;
          interview_round_count?: number;
          interview_rounds_description?: string;
          interview_tips?: string | null;
          like_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      review_likes: {
        Row: {
          id: string;
          user_id: string;
          review_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          review_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          review_id?: string;
          created_at?: string;
        };
      };
      test_records: {
        Row: {
          id: string;
          created_at: string;
          name: string | null;
          value: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name?: string | null;
          value?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string | null;
          value?: string | null;
        };
      };
      saved_companies: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string;
          created_at?: string;
        };
      };
    };
  };
}

// Helper types for working with reviews
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type Role = Database["public"]["Tables"]["roles"]["Row"];
export type RoleInsert = Database["public"]["Tables"]["roles"]["Insert"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];
export type ReviewLike = Database["public"]["Tables"]["review_likes"]["Row"];
export type SavedCompany = Database["public"]["Tables"]["saved_companies"]["Row"];

// Extended review with joined data
export interface ReviewWithDetails extends Review {
  company: Company;
  role: Role;
  user_has_liked?: boolean;
}

// Company with aggregated stats from reviews
export interface CompanyWithStats extends Company {
  review_count: number;
  avg_pay_cad: number | null;
  avg_pay_usd: number | null;
  avg_interview_rounds: number | null;
  common_interview_format: string | null;
  work_style_breakdown: {
    onsite: number;
    hybrid: number;
    remote: number;
  };
  common_roles: string[];
  common_locations: string[];
  avg_duration_months: number | null;
  common_technologies: string[];
  user_has_saved?: boolean;
}
