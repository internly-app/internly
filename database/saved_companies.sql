-- Saved Companies Table
-- Run this in your Supabase SQL Editor after schema.sql

-- Saved companies table (for user bookmarks)
CREATE TABLE saved_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX idx_saved_companies_user_id ON saved_companies(user_id);
CREATE INDEX idx_saved_companies_company_id ON saved_companies(company_id);

-- Row Level Security Policies
ALTER TABLE saved_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Saved companies are viewable by the owner"
  ON saved_companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save companies"
  ON saved_companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave their own saved companies"
  ON saved_companies FOR DELETE
  USING (auth.uid() = user_id);

