-- Internly Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_name ON companies(name);

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, slug)
);

CREATE INDEX idx_roles_company_id ON roles(company_id);
CREATE INDEX idx_roles_slug ON roles(slug);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  
  -- Basic info
  location TEXT NOT NULL,
  term TEXT NOT NULL, -- e.g., "Summer 2024", "Fall 2023"
  duration_months INTEGER, -- Optional: Duration in months (e.g., 3, 4, 6)
  work_style TEXT NOT NULL CHECK (work_style IN ('onsite', 'hybrid', 'remote')),
  work_hours TEXT CHECK (work_hours IN ('full-time', 'part-time')), -- Optional: Full-time or part-time
  team_name TEXT, -- Optional: Team name at the company
  technologies TEXT, -- Optional: Technologies, languages, tools used (comma-separated or free text)
  
  -- Written content
  summary TEXT NOT NULL,
  hardest TEXT NOT NULL,
  best TEXT NOT NULL,
  advice TEXT NOT NULL,
  
  -- Compensation (optional)
  wage_hourly DECIMAL(10, 2),
  wage_currency TEXT DEFAULT 'CAD',
  housing_provided BOOLEAN DEFAULT false,
  housing_stipend DECIMAL(10, 2),
  perks TEXT,
  
  -- Interview (required)
  interview_round_count INTEGER NOT NULL,
  interview_rounds_description TEXT NOT NULL,
  interview_tips TEXT NOT NULL,
  
  -- Engagement
  like_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One review per user per role
  UNIQUE(user_id, role_id)
);

CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_company_id ON reviews(company_id);
CREATE INDEX idx_reviews_role_id ON reviews(role_id);
CREATE INDEX idx_reviews_like_count ON reviews(like_count DESC);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Review likes table
CREATE TABLE review_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

CREATE INDEX idx_review_likes_user_id ON review_likes(user_id);
CREATE INDEX idx_review_likes_review_id ON review_likes(review_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update like_count on reviews
CREATE OR REPLACE FUNCTION update_review_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews SET like_count = like_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews SET like_count = like_count - 1 WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for like_count updates
CREATE TRIGGER update_review_like_count_trigger
AFTER INSERT OR DELETE ON review_likes
FOR EACH ROW EXECUTE FUNCTION update_review_like_count();

-- Row Level Security Policies

-- Companies: Public read, authenticated write
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies are viewable by everyone"
  ON companies FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create companies"
  ON companies FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Roles: Public read, authenticated write
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles are viewable by everyone"
  ON roles FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create roles"
  ON roles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Reviews: Public read, users manage their own
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own reviews"
  ON reviews FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- Review likes: Users manage their own likes
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review likes are viewable by everyone"
  ON review_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own likes"
  ON review_likes FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own likes"
  ON review_likes FOR DELETE
  USING ((SELECT auth.uid()) = user_id);
