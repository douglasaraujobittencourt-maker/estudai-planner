
-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  xp INT NOT NULL DEFAULT 0,
  streak_days INT NOT NULL DEFAULT 0,
  last_study_date DATE,
  weekly_goal_hours INT NOT NULL DEFAULT 14,
  weekly_goal_questions INT NOT NULL DEFAULT 100,
  exam_name TEXT DEFAULT 'TDAS · SEDES/DF',
  exam_date DATE DEFAULT '2026-09-06',
  pages_per_hour INT DEFAULT 10,
  minutes_per_question INT DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================
-- SUBJECTS (matérias do edital)
-- =========================
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ord INT NOT NULL DEFAULT 0,
  pages INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  weight INT NOT NULL DEFAULT 5,
  color TEXT DEFAULT '#22D3EE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subjects" ON public.subjects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- STUDY SESSIONS (log real)
-- =========================
CREATE TYPE public.session_kind AS ENUM ('leitura','questoes','revisao','redacao','flashcards');

CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  kind public.session_kind NOT NULL DEFAULT 'leitura',
  minutes INT NOT NULL DEFAULT 0,
  pages_read INT NOT NULL DEFAULT 0,
  questions_done INT NOT NULL DEFAULT 0,
  questions_correct INT NOT NULL DEFAULT 0,
  notes TEXT,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ix_sessions_user_date ON public.study_sessions(user_id, session_date DESC);

-- =========================
-- REVIEWS (curva do esquecimento por matéria/tópico)
-- =========================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic TEXT,
  layer INT NOT NULL DEFAULT 1, -- 1=24h, 2=7d, 3=30d, 4=fixação
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_reviewed_at TIMESTAMPTZ,
  ease NUMERIC NOT NULL DEFAULT 2.5,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reviews" ON public.reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ix_reviews_due ON public.reviews(user_id, next_review_date);

-- =========================
-- ERRORS (caderno de erros)
-- =========================
CREATE TABLE public.errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic TEXT,
  banca TEXT,
  question TEXT NOT NULL,
  correct_answer TEXT,
  my_answer TEXT,
  reason TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.errors TO authenticated;
GRANT ALL ON public.errors TO service_role;
ALTER TABLE public.errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own errors" ON public.errors FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- FLASHCARDS (Leitner-lite)
-- =========================
CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  error_id UUID REFERENCES public.errors(id) ON DELETE SET NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  box INT NOT NULL DEFAULT 1, -- 1..5
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_reviewed_at TIMESTAMPTZ,
  times_reviewed INT NOT NULL DEFAULT 0,
  times_correct INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
GRANT ALL ON public.flashcards TO service_role;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own flashcards" ON public.flashcards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ix_flashcards_due ON public.flashcards(user_id, next_review_date);

-- =========================
-- CYCLE (fila de rotação de matérias)
-- Cada linha representa 1 hora de rotação; ordem controla o ciclo.
-- =========================
CREATE TABLE public.cycle_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  ord INT NOT NULL DEFAULT 0,
  hours_per_cycle INT NOT NULL DEFAULT 1,
  done_hours INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycle_slots TO authenticated;
GRANT ALL ON public.cycle_slots TO service_role;
ALTER TABLE public.cycle_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cycle" ON public.cycle_slots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- TRIGGER: cria profile + seed SEDES/DF ao registrar usuário
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  sid UUID;
  i INT := 0;
  subjects_data JSONB := '[
    {"name":"Marcos Operacionais do SUAS","pages":42,"q":128,"color":"#A78BFA"},
    {"name":"Programas e Benefícios Socioassistenciais do DF","pages":27,"q":81,"color":"#A78BFA"},
    {"name":"Direito Constitucional","pages":44,"q":130,"color":"#34D399"},
    {"name":"Direito Administrativo","pages":27,"q":83,"color":"#34D399"},
    {"name":"Cuidados e Rotinas Administrativas","pages":29,"q":84,"color":"#34D399"},
    {"name":"Arquivologia","pages":17,"q":53,"color":"#34D399"},
    {"name":"Licitações","pages":12,"q":38,"color":"#34D399"},
    {"name":"Gestão de Materiais","pages":21,"q":71,"color":"#34D399"},
    {"name":"Língua Portuguesa","pages":109,"q":344,"color":"#38BDF8"},
    {"name":"Realidade do DF e RIDE","pages":23,"q":73,"color":"#38BDF8"},
    {"name":"Lei Orgânica do DF (Título VI)","pages":30,"q":90,"color":"#38BDF8"},
    {"name":"Lei dos Servidores (LC 840)","pages":23,"q":75,"color":"#38BDF8"},
    {"name":"PDPM (II Plano)","pages":24,"q":76,"color":"#38BDF8"},
    {"name":"Lei Maria da Penha","pages":31,"q":109,"color":"#38BDF8"},
    {"name":"Carreira Pública de AS do DF (Lei 7.484)","pages":27,"q":94,"color":"#38BDF8"},
    {"name":"Primeiros Socorros","pages":17,"q":63,"color":"#38BDF8"}
  ]'::jsonb;
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  FOR s IN SELECT * FROM jsonb_array_elements(subjects_data) LOOP
    INSERT INTO public.subjects (user_id, name, ord, pages, total_questions, color)
    VALUES (
      NEW.id,
      s.value->>'name',
      i,
      (s.value->>'pages')::INT,
      (s.value->>'q')::INT,
      s.value->>'color'
    )
    RETURNING id INTO sid;

    INSERT INTO public.cycle_slots (user_id, subject_id, ord) VALUES (NEW.id, sid, i);
    i := i + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- Helper: updated_at
-- =========================
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
