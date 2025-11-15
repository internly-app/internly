/**
 * Validation Schemas using Zod
 *
 * These schemas ensure type safety across your application.
 * Use them for:
 * - API route request validation
 * - Form validation
 * - Type inference
 */

import { z } from "zod";

// ==================== Internship Schemas ====================

export const internshipCreateSchema = z.object({
  company: z.string().min(1, "Company name is required").max(200),
  role: z.string().min(1, "Role is required").max(200),
  location: z.string().min(1, "Location is required").max(200),
  type: z.enum(["remote", "hybrid", "onsite"]),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  salary_min: z.number().int().positive().optional(),
  salary_max: z.number().int().positive().optional(),
  application_url: z.string().url().optional(),
  is_active: z.boolean().default(true),
});

export const internshipUpdateSchema = internshipCreateSchema.partial();

export type InternshipCreate = z.infer<typeof internshipCreateSchema>;
export type InternshipUpdate = z.infer<typeof internshipUpdateSchema>;

// ==================== Review Schemas ====================

export const reviewCreateSchema = z.object({
  internship_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1, "Title is required").max(200),
  pros: z.string().optional(),
  cons: z.string().optional(),
  advice: z.string().optional(),
  would_recommend: z.boolean(),
  work_life_balance: z.number().int().min(1).max(5).optional(),
  learning_opportunities: z.number().int().min(1).max(5).optional(),
  mentorship: z.number().int().min(1).max(5).optional(),
});

export const reviewUpdateSchema = reviewCreateSchema
  .partial()
  .omit({ internship_id: true });

export type ReviewCreate = z.infer<typeof reviewCreateSchema>;
export type ReviewUpdate = z.infer<typeof reviewUpdateSchema>;

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

// ==================== Query/Filter Schemas ====================

export const internshipFilterSchema = z.object({
  company: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(["remote", "hybrid", "onsite"]).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type InternshipFilter = z.infer<typeof internshipFilterSchema>;
