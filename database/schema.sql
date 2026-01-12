-- Internly Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website TEXT,
  industry TEXT,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

  -- Basic info
  location TEXT NOT NULL,
  term TEXT NOT NULL,
  duration_months INTEGER,
  work_style TEXT NOT NULL CHECK (work_style IN ('onsite', 'hybrid', 'remote')),
  team_name TEXT,
  technologies TEXT,

  -- Written content
  hardest TEXT NOT NULL,
  best TEXT NOT NULL,
  advice TEXT,

  -- Compensation
  wage_hourly NUMERIC NOT NULL,
  wage_currency TEXT NOT NULL DEFAULT 'CAD',
  housing_stipend_provided BOOLEAN NOT NULL DEFAULT false,
  housing_stipend NUMERIC,
  perks TEXT,

  -- Interview
  interview_round_count INTEGER NOT NULL,
  interview_rounds_description TEXT NOT NULL,
  interview_tips TEXT,

  -- Engagement
  like_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, role_id)
);

-- Review likes table
CREATE TABLE review_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

-- Saved companies table
CREATE TABLE saved_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Companies indexes
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_name_gin ON companies USING gin(to_tsvector('english', name));
CREATE INDEX idx_companies_industry_gin ON companies USING gin(to_tsvector('english', COALESCE(industry, '')));
CREATE INDEX idx_companies_review_count ON companies(review_count DESC);

-- Roles indexes
CREATE INDEX idx_roles_company_id ON roles(company_id);
CREATE INDEX idx_roles_slug ON roles(slug);

-- Reviews indexes
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_company_id ON reviews(company_id);
CREATE INDEX idx_reviews_role_id ON reviews(role_id);
CREATE INDEX idx_reviews_like_count ON reviews(like_count DESC);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_company_likes ON reviews(company_id, like_count DESC);
CREATE INDEX idx_reviews_company_created ON reviews(company_id, created_at DESC);
CREATE INDEX idx_reviews_role_likes ON reviews(role_id, like_count DESC);
CREATE INDEX idx_reviews_role_created ON reviews(role_id, created_at DESC);
CREATE INDEX idx_reviews_workstyle_likes ON reviews(work_style, like_count DESC);
CREATE INDEX idx_reviews_workstyle_created ON reviews(work_style, created_at DESC);
CREATE INDEX idx_reviews_technologies_gin ON reviews USING gin(to_tsvector('english', COALESCE(technologies, '')));
CREATE INDEX idx_reviews_wage_hourly_partial ON reviews(wage_hourly DESC) WHERE wage_hourly IS NOT NULL;
CREATE INDEX idx_reviews_housing_partial ON reviews(company_id, housing_stipend_provided) WHERE housing_stipend_provided = true;

-- Review likes indexes
CREATE INDEX idx_review_likes_user_id ON review_likes(user_id);
CREATE INDEX idx_review_likes_review_id ON review_likes(review_id);
CREATE INDEX idx_review_likes_user_id_review_id ON review_likes(user_id, review_id);
CREATE INDEX idx_review_likes_review_id_user_id ON review_likes(review_id, user_id);
CREATE INDEX idx_review_likes_user_review ON review_likes(user_id, review_id, created_at);
CREATE INDEX idx_review_likes_covering ON review_likes(user_id, review_id) INCLUDE (created_at);

-- Saved companies indexes
CREATE INDEX idx_saved_companies_user_id ON saved_companies(user_id);
CREATE INDEX idx_saved_companies_company_id ON saved_companies(company_id);
CREATE INDEX idx_saved_companies_user_created ON saved_companies(user_id, created_at DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

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
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews SET like_count = like_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for like_count updates
CREATE TRIGGER update_review_like_count_trigger
AFTER INSERT OR DELETE ON review_likes

-- Function to update review_count on companies
CREATE OR REPLACE FUNCTION update_company_review_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE companies SET review_count = review_count + 1 WHERE id = NEW.company_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE companies SET review_count = GREATEST(review_count - 1, 0) WHERE id = OLD.company_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for company review_count updates
CREATE TRIGGER update_company_review_count_trigger
  AFTER INSERT OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_company_review_count();
-- ============================================================================

-- Companies: Public read, authenticated write
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies are viewable by everyone"
  ON companies FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create companies"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Roles: Public read, authenticated write
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles are viewable by everyone"
  ON roles FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create roles"
  ON roles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Reviews: Public read, users manage their own
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Review likes: Users manage their own likes
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review likes are viewable by everyone"
  ON review_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own likes"
  ON review_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON review_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Saved companies: Private to user
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
