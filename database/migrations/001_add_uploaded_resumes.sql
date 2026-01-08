-- Migration: Add uploaded_resumes table for admin tracking
-- Run this in your Supabase SQL Editor
--
-- This stores metadata for all resumes uploaded through ATS analysis.
-- Actual files are stored in the "resumes" Storage bucket.

-- ============================================================================
-- TABLE: uploaded_resumes
-- ============================================================================

CREATE TABLE IF NOT EXISTS uploaded_resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User info
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,                           -- Denormalized for easy admin viewing

  -- File info
  file_name VARCHAR(255) NOT NULL,           -- Original filename (capped at 255 chars)
  file_path TEXT NOT NULL,                   -- Supabase Storage path: {user_id}/{timestamp}_{filename}
  file_type VARCHAR(50) NOT NULL,            -- "PDF" or "DOCX"
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),  -- Max 5MB (5 * 1024 * 1024)

  -- Context
  job_description_preview VARCHAR(500),      -- First 500 chars of JD for admin context

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- For browsing recent uploads
CREATE INDEX IF NOT EXISTS idx_uploaded_resumes_created_at
  ON uploaded_resumes(created_at DESC);

-- For searching by user email
CREATE INDEX IF NOT EXISTS idx_uploaded_resumes_user_email
  ON uploaded_resumes(user_email);

-- For looking up by user
CREATE INDEX IF NOT EXISTS idx_uploaded_resumes_user_id
  ON uploaded_resumes(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS but add NO policies = only service_role / dashboard can access
-- This is intentional for admin-only access
ALTER TABLE uploaded_resumes ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for regular users
-- Admins access via Supabase dashboard (uses service_role which bypasses RLS)
