-- Migration: Drop work_hours column from reviews table
-- This field is no longer used (full-time/part-time is not collected)

-- Drop the work_hours column
ALTER TABLE public.reviews DROP COLUMN IF EXISTS work_hours;

