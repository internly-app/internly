/**
 * Validation Schemas using Zod
 *
 * These schemas ensure type safety across your application.
 * Use them for API route validation and form validation.
 */

import { z } from "zod";

// ==================== Company & Role Schemas ====================

export const companyCreateSchema = z.object({
  name: z.string().min(1, "Company name is required").max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  logo_url: z.string().url().optional(),
  website: z.string().url().optional(),
  industry: z.string().max(100).optional(),
});

export const roleCreateSchema = z.object({
  title: z.string().min(1, "Role title is required").max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  company_id: z.string().uuid("Invalid company ID"),
});

export type CompanyCreate = z.infer<typeof companyCreateSchema>;
export type RoleCreate = z.infer<typeof roleCreateSchema>;

// ==================== Review Schemas ====================

export const reviewCreateSchema = z.object({
  company_id: z.string().uuid("Invalid company ID"),
  role_id: z.string().uuid("Invalid role ID"),

  // Basic info
  location: z.string().min(1, "Location is required").max(200),
  term: z.string().min(1, "Term is required").max(100),
  work_style: z.enum(["onsite", "hybrid", "remote"]),

  // Ratings (1-5, overall is auto-calculated average)
  rating_overall: z.number().min(1).max(5),
  rating_wlb: z.number().int().min(1).max(5),
  rating_learning: z.number().int().min(1).max(5),
  rating_culture: z.number().int().min(1).max(5),
  rating_management: z.number().int().min(1).max(5),
  rating_impact: z.number().int().min(1).max(5),

  // Written content (no minimum length required)
  summary: z.string().max(2000),
  hardest: z.string().max(1000),
  best: z.string().max(1000),
  advice: z.string().max(1000),

  // Compensation (optional)
  wage_hourly: z.number().positive().optional(),
  wage_currency: z.string().length(3).default("USD"),
  housing_provided: z.boolean().optional(),
  housing_stipend: z.number().positive().optional(),
  perks: z.string().max(500).optional(),

  // Interview (required, no minimum length)
  interview_round_count: z.number().int().min(0).max(20),
  interview_rounds_description: z.string().max(1000),
  interview_tips: z.string().max(1000),
});

export const reviewUpdateSchema = reviewCreateSchema
  .partial()
  .omit({ company_id: true, role_id: true });

export type ReviewCreate = z.infer<typeof reviewCreateSchema>;
export type ReviewUpdate = z.infer<typeof reviewUpdateSchema>;

// ==================== Query/Filter Schemas ====================

export const reviewsQuerySchema = z.object({
  company_id: z.string().uuid().optional(),
  role_id: z.string().uuid().optional(),
  work_style: z.enum(["onsite", "hybrid", "remote"]).optional(),
  sort: z.enum(["likes", "recent"]).default("likes"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ReviewsQuery = z.infer<typeof reviewsQuerySchema>;

// ==================== User Profile Schemas ====================

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  university: z.string().max(200).optional(),
  graduation_year: z.number().int().min(2020).max(2030).optional(),
  major: z.string().max(200).optional(),
  bio: z.string().max(500).optional(),
  linkedin_url: z.string().url().optional(),
  github_url: z.string().url().optional(),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
