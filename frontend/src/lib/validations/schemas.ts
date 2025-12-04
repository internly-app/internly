/**
 * Validation Schemas using Zod
 *
 * These schemas ensure type safety across your application.
 * Use them for API route validation and form validation.
 */

import { z } from "zod";
import {
  validateCompanyName,
  validateRoleName,
  validateReviewContent,
  sanitizeText,
} from "@/lib/security/content-filter";

// ==================== Company & Role Schemas ====================

export const companyCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Company name is required")
    .max(200)
    .transform((val) => sanitizeText(val))
    .refine(
      (val) => validateCompanyName(val).isValid,
      (val) => ({ message: validateCompanyName(val).reason || "Invalid company name" })
    ),
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
  title: z
    .string()
    .min(1, "Role title is required")
    .max(200)
    .transform((val) => sanitizeText(val))
    .refine(
      (val) => validateRoleName(val).isValid,
      (val) => ({ message: validateRoleName(val).reason || "Invalid role name" })
    ),
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
  duration_months: z.number().int().min(1).max(24).optional(),
  work_style: z.enum(["onsite", "hybrid", "remote"]),
  work_hours: z.enum(["full-time", "part-time"]).optional(),
  team_name: z
    .string()
    .max(200)
    .optional()
    .transform((val) => (val ? sanitizeText(val) : val))
    .refine(
      (val) => {
        if (!val) return true;
        const validation = validateRoleName(val); // Reuse role validation for team names
        return validation.isValid;
      },
      (val) => {
        const validation = validateRoleName(val || "");
        return { message: validation.reason || "Team name contains inappropriate content" };
      }
    ),
  technologies: z
    .string()
    .max(500)
    .optional()
    .transform((val) => (val ? sanitizeText(val) : val)),

  // Written content (no minimum length required)
  hardest: z
    .string()
    .max(1000)
    .transform((val) => sanitizeText(val))
    .refine(
      (val) => {
        if (!val) return true;
        const validation = validateReviewContent(val, "Hardest part");
        return validation.isValid;
      },
      (val) => {
        const validation = validateReviewContent(val, "Hardest part");
        return { message: validation.reason || "Hardest part contains inappropriate content" };
      }
    ),
  best: z
    .string()
    .max(1000)
    .transform((val) => sanitizeText(val))
    .refine(
      (val) => {
        if (!val) return true;
        const validation = validateReviewContent(val, "Best part");
        return validation.isValid;
      },
      (val) => {
        const validation = validateReviewContent(val, "Best part");
        return { message: validation.reason || "Best part contains inappropriate content" };
      }
    ),
  advice: z
    .string()
    .max(1000)
    .optional()
    .transform((val) => val ? sanitizeText(val) : undefined)
    .refine(
      (val) => {
        if (!val) return true;
        const validation = validateReviewContent(val, "Advice");
        return validation.isValid;
      },
      (val) => {
        const validation = validateReviewContent(val, "Advice");
        return { message: validation.reason || "Advice contains inappropriate content" };
      }
    ),

  // Compensation (optional)
  wage_hourly: z.number().positive().optional(),
  wage_currency: z.string().length(3).default("CAD"),
  housing_provided: z.boolean().optional(),
  housing_stipend: z.number().positive().optional(),
  perks: z.string().max(500).optional(),

  // Interview (required, no minimum length)
  interview_round_count: z.number().int().min(0).max(20),
  interview_rounds_description: z
    .string()
    .max(1000)
    .transform((val) => sanitizeText(val))
    .refine(
      (val) => {
        if (!val) return true;
        const validation = validateReviewContent(val, "Interview description");
        return validation.isValid;
      },
      (val) => {
        const validation = validateReviewContent(val, "Interview description");
        return { message: validation.reason || "Interview description contains inappropriate content" };
      }
    ),
  interview_tips: z
    .string()
    .max(1000)
    .transform((val) => sanitizeText(val))
    .refine(
      (val) => {
        if (!val) return true;
        const validation = validateReviewContent(val, "Interview tips");
        return validation.isValid;
      },
      (val) => {
        const validation = validateReviewContent(val, "Interview tips");
        return { message: validation.reason || "Interview tips contains inappropriate content" };
      }
    ),
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
