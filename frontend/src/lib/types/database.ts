/**
 * Database Types
 *
 * TypeScript types for your Supabase tables.
 * Generate automatically with: npx supabase gen types typescript --project-id your-project-id
 *
 * For now, these are manual types matching your schema.
 */

export interface Database {
  public: {
    Tables: {
      internships: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          company: string;
          role: string;
          location: string;
          type: "remote" | "hybrid" | "onsite";
          description: string | null;
          requirements: string[] | null;
          salary_min: number | null;
          salary_max: number | null;
          application_url: string | null;
          is_active: boolean;
          posted_by: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          company: string;
          role: string;
          location: string;
          type: "remote" | "hybrid" | "onsite";
          description?: string | null;
          requirements?: string[] | null;
          salary_min?: number | null;
          salary_max?: number | null;
          application_url?: string | null;
          is_active?: boolean;
          posted_by?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          company?: string;
          role?: string;
          location?: string;
          type?: "remote" | "hybrid" | "onsite";
          description?: string | null;
          requirements?: string[] | null;
          salary_min?: number | null;
          salary_max?: number | null;
          application_url?: string | null;
          is_active?: boolean;
          posted_by?: string | null;
        };
      };
      reviews: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          internship_id: string;
          user_id: string;
          rating: number;
          title: string;
          pros: string | null;
          cons: string | null;
          advice: string | null;
          would_recommend: boolean;
          work_life_balance: number | null;
          learning_opportunities: number | null;
          mentorship: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          internship_id: string;
          user_id: string;
          rating: number;
          title: string;
          pros?: string | null;
          cons?: string | null;
          advice?: string | null;
          would_recommend: boolean;
          work_life_balance?: number | null;
          learning_opportunities?: number | null;
          mentorship?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          internship_id?: string;
          user_id?: string;
          rating?: number;
          title?: string;
          pros?: string | null;
          cons?: string | null;
          advice?: string | null;
          would_recommend?: boolean;
          work_life_balance?: number | null;
          learning_opportunities?: number | null;
          mentorship?: number | null;
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
