-- Adiciona colunas de controle de blocos de estudo e manutenção na tabela subjects
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS study_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS study_block INT NOT NULL DEFAULT 1;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS queue_order INT NOT NULL DEFAULT 0;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS maintenance_weekly_questions_goal INT NOT NULL DEFAULT 50;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS maintenance_questions_this_week INT NOT NULL DEFAULT 0;

-- Função auxiliar para alinhar as matérias existentes dos usuários
CREATE OR REPLACE FUNCTION public.initialize_user_study_blocks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID;
BEGIN
  FOR uid IN SELECT id FROM auth.users LOOP
    -- Garante que o assunto 'Redação' exista para cada usuário
    IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE user_id = uid AND name = 'Redação') THEN
      INSERT INTO public.subjects (user_id, name, ord, pages, total_questions, color)
      VALUES (uid, 'Redação', 99, 10, 10, '#A78BFA');
    END IF;

    -- Atualiza blocos, ordem da fila e status conforme regras do usuário
    UPDATE public.subjects SET study_block = 1, queue_order = 1, study_status = 'active', color = '#38BDF8' WHERE user_id = uid AND name = 'Língua Portuguesa';
    UPDATE public.subjects SET study_block = 1, queue_order = 2, study_status = 'active', color = '#A78BFA' WHERE user_id = uid AND name = 'Marcos Operacionais do SUAS';
    UPDATE public.subjects SET study_block = 1, queue_order = 3, study_status = 'active', color = '#34D399' WHERE user_id = uid AND name = 'Direito Administrativo';
    UPDATE public.subjects SET study_block = 1, queue_order = 4, study_status = 'active', color = '#34D399' WHERE user_id = uid AND name = 'Cuidados e Rotinas Administrativas';
    UPDATE public.subjects SET study_block = 1, queue_order = 5, study_status = 'pending', color = '#34D399' WHERE user_id = uid AND name = 'Arquivologia';
    
    UPDATE public.subjects SET study_block = 2, queue_order = 6, study_status = 'pending', color = '#A78BFA' WHERE user_id = uid AND name = 'Redação';
    UPDATE public.subjects SET study_block = 2, queue_order = 7, study_status = 'pending', color = '#34D399' WHERE user_id = uid AND name = 'Direito Constitucional';
    UPDATE public.subjects SET study_block = 2, queue_order = 8, study_status = 'pending', color = '#38BDF8' WHERE user_id = uid AND name = 'Lei Maria da Penha';
    UPDATE public.subjects SET study_block = 2, queue_order = 9, study_status = 'pending', color = '#34D399' WHERE user_id = uid AND name = 'Licitações';
    UPDATE public.subjects SET study_block = 2, queue_order = 10, study_status = 'pending', color = '#34D399' WHERE user_id = uid AND name = 'Gestão de Materiais';
    
    UPDATE public.subjects SET study_block = 3, queue_order = 11, study_status = 'pending', color = '#A78BFA' WHERE user_id = uid AND name = 'Programas e Benefícios Socioassistenciais do DF';
    UPDATE public.subjects SET study_block = 3, queue_order = 12, study_status = 'pending', color = '#38BDF8' WHERE user_id = uid AND name = 'PDPM (II Plano)';
    UPDATE public.subjects SET study_block = 3, queue_order = 13, study_status = 'pending', color = '#38BDF8' WHERE user_id = uid AND name = 'Lei dos Servidores (LC 840)';
    UPDATE public.subjects SET study_block = 3, queue_order = 14, study_status = 'pending', color = '#38BDF8' WHERE user_id = uid AND name = 'Carreira Pública de AS do DF (Lei 7.484)';
    UPDATE public.subjects SET study_block = 3, queue_order = 15, study_status = 'pending', color = '#38BDF8' WHERE user_id = uid AND name = 'Realidade do DF e RIDE';
    
    UPDATE public.subjects SET study_block = 4, queue_order = 16, study_status = 'pending', color = '#38BDF8' WHERE user_id = uid AND name = 'Lei Orgânica do DF (Título VI)';
    UPDATE public.subjects SET study_block = 4, queue_order = 17, study_status = 'pending', color = '#38BDF8' WHERE user_id = uid AND name = 'Primeiros Socorros';
  END LOOP;
END;
$$;

SELECT public.initialize_user_study_blocks();

-- Atualiza a trigger de criação de novos usuários para incluir a redação e os blocos/fila corretos
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
  status TEXT;
  subjects_data JSONB := '[
    {"name":"Língua Portuguesa","pages":109,"q":344,"color":"#38BDF8","block":1,"order":1},
    {"name":"Marcos Operacionais do SUAS","pages":42,"q":128,"color":"#A78BFA","block":1,"order":2},
    {"name":"Direito Administrativo","pages":27,"q":83,"color":"#34D399","block":1,"order":3},
    {"name":"Cuidados e Rotinas Administrativas","pages":29,"q":84,"color":"#34D399","block":1,"order":4},
    {"name":"Arquivologia","pages":17,"q":53,"color":"#34D399","block":1,"order":5},
    {"name":"Redação","pages":10,"q":10,"color":"#A78BFA","block":2,"order":6},
    {"name":"Direito Constitucional","pages":44,"q":130,"color":"#34D399","block":2,"order":7},
    {"name":"Lei Maria da Penha","pages":31,"q":109,"color":"#38BDF8","block":2,"order":8},
    {"name":"Licitações","pages":12,"q":38,"color":"#34D399","block":2,"order":9},
    {"name":"Gestão de Materiais","pages":21,"q":71,"color":"#34D399","block":2,"order":10},
    {"name":"Programas e Benefícios Socioassistenciais do DF","pages":27,"q":81,"color":"#A78BFA","block":3,"order":11},
    {"name":"PDPM (II Plano)","pages":24,"q":76,"color":"#38BDF8","block":3,"order":12},
    {"name":"Lei dos Servidores (LC 840)","pages":23,"q":75,"color":"#38BDF8","block":3,"order":13},
    {"name":"Carreira Pública de AS do DF (Lei 7.484)","pages":27,"q":94,"color":"#38BDF8","block":3,"order":14},
    {"name":"Realidade do DF e RIDE","pages":23,"q":73,"color":"#38BDF8","block":3,"order":15},
    {"name":"Lei Orgânica do DF (Título VI)","pages":30,"q":90,"color":"#38BDF8","block":4,"order":16},
    {"name":"Primeiros Socorros","pages":17,"q":63,"color":"#38BDF8","block":4,"order":17}
  ]'::jsonb;
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  FOR s IN SELECT * FROM jsonb_array_elements(subjects_data) LOOP
    IF (s.value->>'order')::INT <= 4 THEN
      status := 'active';
    ELSE
      status := 'pending';
    END IF;

    INSERT INTO public.subjects (user_id, name, ord, pages, total_questions, color, study_status, study_block, queue_order)
    VALUES (
      NEW.id,
      s.value->>'name',
      i,
      (s.value->>'pages')::INT,
      (s.value->>'q')::INT,
      s.value->>'color',
      status,
      (s.value->>'block')::INT,
      (s.value->>'order')::INT
    )
    RETURNING id INTO sid;

    -- Apenas cria slots no ciclo de estudos para as 4 ativas inicialmente
    IF status = 'active' THEN
      INSERT INTO public.cycle_slots (user_id, subject_id, ord) VALUES (NEW.id, sid, i);
    END IF;
    
    i := i + 1;
  END LOOP;

  RETURN NEW;
END;
$$;
