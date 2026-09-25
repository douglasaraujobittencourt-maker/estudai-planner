ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS study_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS maintenance_questions_this_week INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maintenance_weekly_questions_goal INTEGER NOT NULL DEFAULT 50;