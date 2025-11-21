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
          work_hours: string | null;
          team_name: string | null;
          technologies: string | null;
          summary: string;
          hardest: string;
          best: string;
          advice: string;
          wage_hourly: number | null;
          wage_currency: string | null;
          housing_provided: boolean | null;
          housing_stipend: number | null;
          perks: string | null;
          interview_round_count: number;
          interview_rounds_description: string;
          interview_tips: string;
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
          work_hours?: string | null;
          team_name?: string | null;
          technologies?: string | null;
          summary: string;
          hardest: string;
          best: string;
          advice: string;
          wage_hourly?: number | null;
          wage_currency?: string | null;
          housing_provided?: boolean | null;
          housing_stipend?: number | null;
          perks?: string | null;
          interview_round_count: number;
          interview_rounds_description: string;
          interview_tips: string;
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
          work_hours?: string | null;
          team_name?: string | null;
          technologies?: string | null;
          summary?: string;
          hardest?: string;
          best?: string;
          advice?: string;
          wage_hourly?: number | null;
          wage_currency?: string | null;
          housing_provided?: boolean | null;
          housing_stipend?: number | null;
          perks?: string | null;
          interview_round_count?: number;
          interview_rounds_description?: string;
          interview_tips?: string;
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

// Extended review with joined data
export interface ReviewWithDetails extends Review {
  company: Company;
  role: Role;
  user_has_liked?: boolean;
}
