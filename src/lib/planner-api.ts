import { localDateStr, addDaysStr } from "./dates";
import { supabase } from "@/integrations/supabase/external-client";

export type Profile = {
  id: string; display_name: string | null; xp: number; streak_days: number;
  last_study_date: string | null; weekly_goal_hours: number; weekly_goal_questions: number;
  exam_name: string | null; exam_date: string | null; pages_per_hour: number | null; minutes_per_question: number | null;
  review_intervals?: number[] | null;
};
export type Subject = {
  id: string; name: string; ord: number; pages: number; pages_read: number; total_questions: number; weight: number; color: string;
  study_status?: string; maintenance_weekly_questions_goal?: number; maintenance_questions_this_week?: number;
  planned_hours_per_week?: number; exam_questions?: number; min_questions?: number;
};

export async function getProfile(): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").maybeSingle();
  return data as any;
}

export async function getSubjects(): Promise<Subject[]> {
  const { data } = await supabase.from("subjects").select("*").order("ord");
  return (data ?? []) as any;
}

export async function getCycle() {
  const { data } = await supabase
    .from("cycle_slots")
    .select("*, subject:subjects(*)")
    .order("ord");
  return data ?? [];
}

export async function getTodaySessions(date: string) {
  const { data } = await supabase.from("study_sessions").select("*, subject:subjects(name,color)").eq("session_date", date).order("created_at", { ascending: false });
  return data ?? [];
}

export async function getSessionsBetween(from: string, to: string) {
  const { data } = await supabase.from("study_sessions").select("*, subject:subjects(id,name,color)").gte("session_date", from).lte("session_date", to);
  return data ?? [];
}

export async function getAllSessions() {
  const { data } = await supabase.from("study_sessions").select("*, subject:subjects(id,name,color)");
  return data ?? [];
}

export function getReviewIntervalDays(layer: number): number {
  switch (layer) {
    case 1: return 7;
    case 2: return 15;
    case 3: return 30;
    case 4: return 60;
    default: return 60;
  }
}

export function getReviewLayerLabel(layer: number): string {
  switch (layer) {
    case 1: return "Revisão de 7 dias";
    case 2: return "Revisão de 15 dias";
    case 3: return "Revisão de 30 dias";
    case 4: return "Revisão de 60 dias";
    default: return `Revisão (${layer})`;
  }
}

export async function getDueReviews(today: string) {
  const { data } = await supabase
    .from("reviews").select("*, subject:subjects(name,color,pages_read,study_status)")
    .eq("next_review_date", today).eq("done", false).order("next_review_date");
  const list = (data ?? []) as any[];
  return list.filter(r => r.subject != null);
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
}

export async function clearAllPendingReviews() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("no user");
  const { error } = await supabase.from("reviews").delete().eq("user_id", u.user.id).eq("done", false);
  if (error) throw error;
}

export async function getDueFlashcards(today: string) {
  const { data } = await supabase
    .from("flashcards").select("*, subject:subjects(name,color,pages_read,study_status)")
    .lte("next_review_date", today).order("next_review_date");
  const list = (data ?? []) as any[];
  return list.filter(c => c.subject && (c.subject.pages_read > 0 || c.subject.study_status === "active" || c.subject.study_status === "finalized"));
}

export async function getErrors() {
  const { data } = await supabase.from("errors").select("*, subject:subjects(name,color)").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAllReviews() {
  const { data } = await supabase
    .from("reviews")
    .select("*, subject:subjects(id, name, color, pages_read, study_status)")
    .order("created_at", { ascending: false });
  return (data ?? []) as any[];
}

export async function setSubjectStatus(id: string, status: "active" | "finalized" | "pending") {
  const { error } = await supabase.from("subjects").update({ study_status: status }).eq("id", id);
  if (error) throw error;
}

export async function logSession(input: {
  subject_id: string | null; kind: "leitura"|"questoes"|"revisao"|"redacao"|"flashcards";
  minutes: number; pages_read?: number; questions_done?: number; questions_correct?: number; notes?: string;
  topic?: string; is_lesson_finished?: boolean; is_subject_finished?: boolean;
  task?: string | null; lesson?: string | null; page_start?: number | null; page_end?: number | null;
  session_date?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("no user");
  // Always stamp the session with the user's LOCAL date — the DB default is UTC,
  // which pushes evening sessions (21h–24h em SP) para o dia seguinte.
  const today = input.session_date || localDateStr();
  const notesText = input.notes || input.topic || null;
  const { error } = await supabase.from("study_sessions").insert({
    subject_id: input.subject_id,
    kind: input.kind,
    minutes: input.minutes,
    pages_read: input.pages_read,
    questions_done: input.questions_done,
    questions_correct: input.questions_correct,
    notes: notesText,
    task: input.task ?? null,
    lesson: input.lesson ?? null,
    page_start: input.page_start ?? null,
    page_end: input.page_end ?? null,
    user_id: u.user.id,
    session_date: today,
  });
  if (error) throw error;
  // Bump gamification
  const prof = await getProfile();
  if (prof) {
    const yesterday = addDaysStr(-1);
    let streak = prof.streak_days;
    if (prof.last_study_date === today) {
      // same day
    } else if (prof.last_study_date === yesterday) {
      streak += 1;
    } else {
      streak = 1;
    }
    const xpGain = Math.max(1, Math.round(input.minutes / 5)) + (input.questions_correct ?? 0);
    await supabase.from("profiles").update({
      xp: prof.xp + xpGain,
      streak_days: streak,
      last_study_date: today,
    }).eq("id", u.user.id);
  }

  // Se a aula foi marcada como finalizada, agenda as 4 etapas de revisão: 7, 15, 30 e 60 dias
  if (input.subject_id && input.is_lesson_finished) {
    await scheduleLessonReviews(input.subject_id, input.topic || input.notes);
  }

  // Se o status da matéria foi informado como finalizada ou não
  if (input.subject_id && input.is_subject_finished !== undefined) {
    const newStatus = input.is_subject_finished ? "finalized" : "active";
    await supabase.from("subjects").update({ study_status: newStatus }).eq("id", input.subject_id);
  }

  // Increment pages_read on the subject when pages were read in this session
  if (input.subject_id && input.pages_read && input.pages_read > 0) {
    const { data: sub } = await supabase.from("subjects").select("pages_read, study_status, maintenance_questions_this_week").eq("id", input.subject_id).maybeSingle();
    if (sub) {
      await supabase.from("subjects").update({
        pages_read: (sub.pages_read ?? 0) + input.pages_read,
        // Also handle maintenance questions if finalized
        ...(sub.study_status === "finalized" && input.questions_done
          ? { maintenance_questions_this_week: (sub.maintenance_questions_this_week ?? 0) + input.questions_done }
          : {}),
      }).eq("id", input.subject_id);
    }
  } else if (input.subject_id && input.questions_done) {
    // If the subject is finalized, increment its maintenance questions this week
    const { data: sub } = await supabase.from("subjects").select("study_status, maintenance_questions_this_week").eq("id", input.subject_id).maybeSingle();
    if (sub && sub.study_status === "finalized") {
      await supabase.from("subjects").update({
        maintenance_questions_this_week: (sub.maintenance_questions_this_week ?? 0) + input.questions_done
      }).eq("id", input.subject_id);
    }
  }
}

export async function scheduleLessonReviews(subjectId: string, topic?: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("no user");

  // Agenda revisões em 7, 15, 30 e 60 dias (layers 1, 2, 3, 4)
  const intervals = [
    { layer: 1, days: 7 },
    { layer: 2, days: 15 },
    { layer: 3, days: 30 },
    { layer: 4, days: 60 },
  ];

  const inserts = intervals.map(({ layer, days }) => ({
    user_id: u.user!.id,
    subject_id: subjectId,
    layer,
    next_review_date: addDaysStr(days),
    topic: topic?.trim() || null,
    done: false,
  }));

  const { error } = await supabase.from("reviews").insert(inserts);
  if (error) throw error;
}

export async function finalizeLesson(subjectId: string, topic?: string) {
  return scheduleLessonReviews(subjectId, topic);
}

export async function completeReview(reviewId: string, layer: number) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;

  // Busca dados da revisão para reagendar
  const { data: rev } = await supabase
    .from("reviews").select("subject_id, topic, layer").eq("id", reviewId).maybeSingle();

  // Marca como concluída
  await supabase.from("reviews").update({ done: true, last_reviewed_at: new Date().toISOString() }).eq("id", reviewId);

  // Se é a revisão de 60 dias (layer 4) ou repetição, agenda a próxima para +60 dias
  if ((layer === 4 || rev?.layer === 4) && rev) {
    await supabase.from("reviews").insert({
      user_id: u.user.id,
      subject_id: rev.subject_id,
      layer: 4,
      next_review_date: addDaysStr(60),
      topic: rev.topic,
      done: false,
    });
  }
}

export async function reviewFlashcard(cardId: string, correct: boolean, box: number) {
  const nextBox = correct ? Math.min(box + 1, 5) : 1;
  const intervals = [1, 2, 4, 8, 16];
  const nextDate = addDaysStr(intervals[nextBox - 1]);
  await supabase.rpc; // no-op placeholder
  const { data: card } = await supabase.from("flashcards").select("times_reviewed, times_correct").eq("id", cardId).maybeSingle();
  await supabase.from("flashcards").update({
    box: nextBox,
    next_review_date: nextDate,
    last_reviewed_at: new Date().toISOString(),
    times_reviewed: (card?.times_reviewed ?? 0) + 1,
    times_correct: (card?.times_correct ?? 0) + (correct ? 1 : 0),
  }).eq("id", cardId);
}

export async function logError(input: {
  subject_id: string | null; topic?: string; banca?: string;
  question: string; correct_answer?: string; my_answer?: string; reason?: string;
  make_flashcard?: boolean; front?: string; back?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("no user");
  const { data: err, error } = await supabase.from("errors").insert({
    user_id: u.user.id,
    subject_id: input.subject_id, topic: input.topic, banca: input.banca,
    question: input.question, correct_answer: input.correct_answer,
    my_answer: input.my_answer, reason: input.reason,
  }).select().single();
  if (error) throw error;
  if (input.make_flashcard && input.front && input.back) {
    await supabase.from("flashcards").insert({
      user_id: u.user.id, subject_id: input.subject_id, error_id: err.id,
      front: input.front, back: input.back,
    });
  }
}

export async function updateError(id: string, patch: {
  subject_id?: string | null; topic?: string | null; banca?: string | null;
  question?: string; correct_answer?: string | null; my_answer?: string | null; reason?: string | null;
}) {
  const { error } = await supabase.from("errors").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteError(id: string) {
  const { error } = await supabase.from("errors").delete().eq("id", id);
  if (error) throw error;
}

export async function updateFlashcard(id: string, patch: { front?: string; back?: string; subject_id?: string | null }) {
  const { error } = await supabase.from("flashcards").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteFlashcard(id: string) {
  const { error } = await supabase.from("flashcards").delete().eq("id", id);
  if (error) throw error;
}

export async function getAllFlashcards() {
  const { data } = await supabase.from("flashcards").select("*, subject:subjects(name,color)").order("created_at", { ascending: false });
  return data ?? [];
}

export async function createFlashcard(input: { front: string; back: string; subject_id: string | null }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("no user");
  const { error } = await supabase.from("flashcards").insert({
    user_id: u.user.id, subject_id: input.subject_id, front: input.front, back: input.back,
  });
  if (error) throw error;
}

export async function updateSession(id: string, patch: {
  subject_id?: string | null; kind?: "leitura"|"questoes"|"revisao"|"redacao"|"flashcards";
  minutes?: number; pages_read?: number; questions_done?: number; questions_correct?: number; notes?: string | null;
  task?: string | null; lesson?: string | null; page_start?: number | null; page_end?: number | null; session_date?: string;
}) {
  // If pages_read changed, adjust the subject's accumulated pages_read by the delta
  if (patch.pages_read !== undefined) {
    const { data: existing } = await supabase.from("study_sessions").select("pages_read, subject_id").eq("id", id).maybeSingle();
    if (existing) {
      const subjectId = patch.subject_id !== undefined ? patch.subject_id : existing.subject_id;
      const oldPages = existing.pages_read ?? 0;
      const newPages = patch.pages_read ?? 0;
      const delta = newPages - oldPages;
      if (delta !== 0 && subjectId) {
        const { data: sub } = await supabase.from("subjects").select("pages_read").eq("id", subjectId).maybeSingle();
        if (sub) {
          await supabase.from("subjects").update({
            pages_read: Math.max(0, (sub.pages_read ?? 0) + delta),
          }).eq("id", subjectId);
        }
      }
    }
  }
  const { error } = await supabase.from("study_sessions").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteSession(id: string) {
  // Subtract this session's pages_read from the subject before deleting
  const { data: existing } = await supabase.from("study_sessions").select("pages_read, subject_id").eq("id", id).maybeSingle();
  if (existing && existing.subject_id && existing.pages_read && existing.pages_read > 0) {
    const { data: sub } = await supabase.from("subjects").select("pages_read").eq("id", existing.subject_id).maybeSingle();
    if (sub) {
      await supabase.from("subjects").update({
        pages_read: Math.max(0, (sub.pages_read ?? 0) - existing.pages_read),
      }).eq("id", existing.subject_id);
    }
  }
  const { error } = await supabase.from("study_sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function updateSubject(id: string, patch: {
  pages?: number; pages_read?: number; total_questions?: number; name?: string; color?: string; weight?: number;
  study_status?: string; maintenance_weekly_questions_goal?: number; maintenance_questions_this_week?: number;
  planned_hours_per_week?: number; exam_questions?: number; min_questions?: number;
}) {
  const { error } = await supabase.from("subjects").update(patch).eq("id", id);
  if (error) throw error;
}

export async function createSubject(input: { name: string; color?: string; weight?: number; pages?: number; pages_read?: number; total_questions?: number }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("no user");
  const { data: existing } = await supabase.from("subjects").select("ord").order("ord", { ascending: false }).limit(1);
  const nextOrd = (existing && existing[0]?.ord ? existing[0].ord : 0) + 1;
  const { error } = await supabase.from("subjects").insert({
    user_id: u.user.id,
    name: input.name,
    color: input.color || "#0284C7",
    weight: input.weight || 2,
    pages: input.pages || 0,
    pages_read: input.pages_read || 0,
    total_questions: input.total_questions || 0,
    ord: nextOrd,
  });
  if (error) throw error;
}

export async function deleteSubject(id: string) {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}

export async function resetAllStudyData() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("no user");

  const uid = u.user.id;
  const fail = (label: string, error: any) => {
    if (error) throw new Error(`${label}: ${error.message ?? error}`);
  };

  // 1. Apaga todos os registros de estudo
  fail("sessões", (await supabase.from("study_sessions").delete().eq("user_id", uid)).error);
  fail("revisões", (await supabase.from("reviews").delete().eq("user_id", uid)).error);
  fail("flashcards", (await supabase.from("flashcards").delete().eq("user_id", uid)).error);
  fail("caderno de erros", (await supabase.from("errors").delete().eq("user_id", uid)).error);

  // 2. Zera o progresso do ciclo de estudos (horas feitas e planejadas por matéria)
  fail("ciclo", (await supabase.from("cycle_slots").update({ done_hours: 0, hours_per_cycle: 1 }).eq("user_id", uid)).error);

  // 3. Reseta páginas (totais e lidas), questões, horas semanais e status das matérias
  fail("matérias", (await supabase.from("subjects").update({
    pages: 0,
    pages_read: 0,
    total_questions: 0,
    exam_questions: 0,
    min_questions: 0,
    maintenance_questions_this_week: 0,
    planned_hours_per_week: 0,
    weight: 0,
    study_status: "pending",
  }).eq("user_id", uid)).error);

  // 4. Reseta gamificação e metas do perfil
  fail("perfil", (await supabase.from("profiles").update({
    xp: 0,
    streak_days: 0,
    last_study_date: null,
    weekly_goal_hours: 14,
    weekly_goal_questions: 100,
  }).eq("id", uid)).error);
}


export async function updateProfile(patch: { weekly_goal_hours?: number; weekly_goal_questions?: number; display_name?: string; exam_name?: string; exam_date?: string | null; review_intervals?: number[] }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("no user");
  try {
    const { error } = await supabase.from("profiles").update(patch).eq("id", u.user.id);
    if (error) {
      // If exam_date is a Postgres date column and "Pré-edital" causes type mismatch, fallback to null
      if (error.message && error.message.includes("date") && patch.exam_date === "Pré-edital") {
        const { error: fallbackErr } = await supabase.from("profiles").update({ ...patch, exam_date: null }).eq("id", u.user.id);
        if (fallbackErr) throw fallbackErr;
        return;
      }
      throw error;
    }
  } catch (e: any) {
    if (patch.exam_date === "Pré-edital") {
      const { error: fallbackErr } = await supabase.from("profiles").update({ ...patch, exam_date: null }).eq("id", u.user.id);
      if (fallbackErr) throw fallbackErr;
      return;
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Bootstrap: cria perfil + matérias + ciclo caso ainda não existam.
// Não depende de trigger no banco.
// ---------------------------------------------------------------------------
const BASIC_COLOR = "#3B82F6";
const SPECIFIC_COLOR = "#22C55E";

const DEFAULT_SUBJECTS: { name: string; pages: number; q: number; color: string }[] = [
  { name: "Língua Portuguesa", pages: 109, q: 344, color: BASIC_COLOR },
  { name: "Raciocínio Lógico-Matemático", pages: 44, q: 130, color: BASIC_COLOR },
  { name: "Noções de Informática", pages: 21, q: 71, color: BASIC_COLOR },
  { name: "Direito Constitucional", pages: 44, q: 130, color: BASIC_COLOR },
  { name: "Direito Administrativo", pages: 27, q: 83, color: BASIC_COLOR },
  { name: "Ética no Serviço Público", pages: 12, q: 38, color: BASIC_COLOR },
  { name: "Seguridade Social", pages: 42, q: 128, color: SPECIFIC_COLOR },
];

export async function ensureUserBootstrap(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return;

  const { data: prof } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!prof) {
    await supabase.from("profiles").insert({
      id: user.id,
      display_name:
        (user.user_metadata as any)?.display_name ?? (user.email ?? "").split("@")[0],
      exam_name: "INSS · Técnico do Seguro Social",
      exam_date: null,
    } as any);
  }

  const { data: subs } = await supabase.from("subjects").select("id").limit(1);
  if (subs && subs.length > 0) return;

  // Seed oficial INSS: TODA conta nova recebe exatamente esta lista,
  // nesta ordem, com estas páginas, questões e cores.
  const rows = DEFAULT_SUBJECTS.map((s, i) => ({
    user_id: user.id,
    name: s.name,
    ord: i,
    pages: s.pages,
    total_questions: s.q,
    color: s.color,
    pages_read: 0,
    study_status: "pending",
    weight: 5,
  }));
  const { data: created } = await supabase.from("subjects").insert(rows as any).select("id, ord");
  if (created?.length) {
    await supabase.from("cycle_slots").insert(
      created.map((c: any) => ({ user_id: user.id, subject_id: c.id, ord: c.ord, hours_per_cycle: 1, done_hours: 0 })) as any,
    );
  }
}
