import { localDateStr, addDaysStr } from "@/lib/dates";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, getSubjects, getDueReviews, completeReview, deleteReview, clearAllPendingReviews, getReviewLayerLabel, getSessionsBetween, getAllSessions, updateSubject, createSubject, deleteSubject, updateProfile, getTodaySessions } from "@/lib/planner-api";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, CalendarDays, Brain, TrendingUp, Pencil, Clock, BarChart3, BookOpen, Plus, Trash2, Check, CheckCircle2, RefreshCw, Award } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function daysUntil(dateStr?: string | null) {
  if (!dateStr || dateStr === "Pré-edital" || dateStr === "pre-edital") return null;
  const target = new Date(dateStr + "T00:00:00");
  if (isNaN(target.getTime())) return null;
  const diff = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getSubjectSigla(name: string): string {
  if (!name) return "";
  const cleaned = name.trim();
  if (cleaned.length <= 2) return cleaned.toUpperCase();

  const map: Record<string, string> = {
    "Português": "PT",
    "Língua Portuguesa": "PT",
    "Direito Constitucional": "DC",
    "Direito Administrativo": "DA",
    "Raciocínio Lógico": "RL",
    "Raciocínio Lógico Matemático": "RL",
    "Auditoria": "AU",
    "Auditoria Fiscal": "AF",
    "Tecnologia da Informação": "TI",
    "Conhecimentos Gerais": "CG",
    "Conhecimentos Específicos": "CE",
    "Legislação Específica": "LE",
    "Direito Tributário": "DT",
    "Contabilidade Geral": "CG",
    "Contabilidade Avançada": "CA",
    "Redação": "RE",
    "Finanças Públicas": "FP",
  };

  if (map[cleaned]) return map[cleaned];

  const words = cleaned.split(/\s+/).filter((w) => !/^(de|e|da|do|dos|das|para|com|a|o)$/i.test(w));
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.substring(0, 2).toUpperCase();
}

function Dashboard() {
  const today = localDateStr();
  const now = new Date();
  const dow = now.getDay();
  const daysSinceMonday = (dow + 6) % 7;
  const weekStart = addDaysStr(-daysSinceMonday);
  const monthStart = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1));

  const qc = useQueryClient();

  const refreshAllData = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["subjects"] }),
      qc.invalidateQueries({ queryKey: ["all-sessions"] }),
      qc.invalidateQueries({ queryKey: ["week"] }),
      qc.invalidateQueries({ queryKey: ["month"] }),
      qc.invalidateQueries({ queryKey: ["sessions"] }),
      qc.invalidateQueries({ queryKey: ["profile"] }),
      qc.invalidateQueries({ queryKey: ["reviews-due"] }),
    ]);
  };

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: getSubjects });
  const { data: dueReviews = [] } = useQuery({ queryKey: ["reviews-due", today], queryFn: () => getDueReviews(today) });
  const { data: weekSessions = [] } = useQuery({ queryKey: ["week", weekStart, today], queryFn: () => getSessionsBetween(weekStart, today) });
  const { data: monthSessions = [] } = useQuery({ queryKey: ["month", monthStart, today], queryFn: () => getSessionsBetween(monthStart, today) });
  const { data: allSessions = [] } = useQuery({ queryKey: ["all-sessions"], queryFn: getAllSessions });

  const doneReview = useMutation({
    mutationFn: ({ id, layer }: { id: string; layer: number }) => completeReview(id, layer),
    onSuccess: () => {
      toast.success("Revisão concluída! 🧠✨");
      qc.invalidateQueries({ queryKey: ["reviews-due"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao concluir revisão"),
  });

  const delReview = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      toast.success("Revisão descartada.");
      qc.invalidateQueries({ queryKey: ["reviews-due"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao descartar revisão"),
  });

  const clearOldReviews = useMutation({
    mutationFn: () => clearAllPendingReviews(),
    onSuccess: () => {
      toast.success("Revisões pendentes limpas com sucesso!");
      qc.invalidateQueries({ queryKey: ["reviews-due"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao limpar revisões"),
  });

  const yesterday = addDaysStr(-1);
  const { data: yesterdaySessions = [] } = useQuery({ queryKey: ["sessions", yesterday], queryFn: () => getTodaySessions(yesterday) });
  const { data: todaySessions = [] } = useQuery({ queryKey: ["sessions", today], queryFn: () => getTodaySessions(today) });

  // Estatísticas de horas
  const todayMinutes = todaySessions.reduce((a: number, s: any) => a + (s.minutes ?? 0), 0);
  const todayHours = +(todayMinutes / 60).toFixed(1);

  const yesterdayMinutes = yesterdaySessions.reduce((a: number, s: any) => a + (s.minutes ?? 0), 0);
  const yesterdayHours = +(yesterdayMinutes / 60).toFixed(1);

  const weekMinutes = weekSessions.reduce((a: number, s: any) => a + (s.minutes ?? 0), 0);
  const weekHours = +(weekMinutes / 60).toFixed(1);

  const goalH = profile?.weekly_goal_hours ?? 28;
  const daysLeft = daysUntil(profile?.exam_date);

  // Horas por matéria
  const weekHoursBySubject: Record<string, number> = {};
  weekSessions.forEach((s: any) => {
    if (s.subject_id) {
      weekHoursBySubject[s.subject_id] = (weekHoursBySubject[s.subject_id] ?? 0) + (s.minutes ?? 0) / 60;
    }
  });

  const readingHoursBySubject: Record<string, number> = {};
  allSessions.filter((s: any) => s.kind === "leitura").forEach((s: any) => {
    if (s.subject_id) {
      readingHoursBySubject[s.subject_id] = (readingHoursBySubject[s.subject_id] ?? 0) + (s.minutes ?? 0) / 60;
    }
  });

  // Horas semanais por matéria
  const weeklySubjectData = subjects.map((s) => {
    const planejado = s.weight ? s.weight * 2 : 4;
    const feito = +(weekHoursBySubject[s.id] ?? 0).toFixed(1);
    const restante = Math.max(0, +(planejado - feito).toFixed(1));
    const sigla = getSubjectSigla(s.name);
    return { ...s, sigla, planejado, feito, restante };
  });

  const totalWeeklyPlanned = weeklySubjectData.reduce((a, s) => a + s.planejado, 0);
  const totalWeeklyDone = +weeklySubjectData.reduce((a, s) => a + s.feito, 0).toFixed(1);
  const totalWeeklyRemaining = +weeklySubjectData.reduce((a, s) => a + s.restante, 0).toFixed(1);

  // Tabela: Progresso de Leitura de PDFs
  const pdfProgressData = subjects.map((s) => {
    const totalPages = s.pages || 0;
    const pagesRead = s.pages_read || 0;
    const pagesRemaining = Math.max(0, totalPages - pagesRead);
    const pct = totalPages > 0 ? Math.round((pagesRead / totalPages) * 100) : 0;
    const readingHours = +(readingHoursBySubject[s.id] ?? 0).toFixed(1);
    const pagsPerHour = readingHours > 0 && pagesRead > 0 ? +(pagesRead / readingHours).toFixed(1) : 0;
    const hoursRemaining = pagsPerHour > 0 ? +(pagesRemaining / pagsPerHour).toFixed(1) : 0;

    return {
      ...s,
      totalPages,
      pagesRead,
      pagesRemaining,
      pct,
      readingHours,
      pagsPerHour,
      hoursRemaining,
    };
  });

  const totalPdfPages = pdfProgressData.reduce((a, s) => a + s.totalPages, 0);
  const totalPdfPagesRead = pdfProgressData.reduce((a, s) => a + s.pagesRead, 0);
  const totalPdfPagesRemaining = pdfProgressData.reduce((a, s) => a + s.pagesRemaining, 0);
  const totalPdfPct = totalPdfPages > 0 ? Math.round((totalPdfPagesRead / totalPdfPages) * 100) : 0;
  const totalPdfReadingHours = +pdfProgressData.reduce((a, s) => a + s.readingHours, 0).toFixed(1);
  const totalPdfPagsPerHour = totalPdfReadingHours > 0 && totalPdfPagesRead > 0 ? +(totalPdfPagesRead / totalPdfReadingHours).toFixed(1) : 0;
  const totalPdfHoursRemaining = totalPdfPagsPerHour > 0 ? +(totalPdfPagesRemaining / totalPdfPagsPerHour).toFixed(1) : 0;

  // Modais de Edição
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0284C7");
  const [plannedHours, setPlannedHours] = useState("4");
  const [pages, setPages] = useState("0");
  const [pagesRead, setPagesRead] = useState("0");

  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalHoursInput, setGoalHoursInput] = useState(String(goalH));

  const [isEditingExamDate, setIsEditingExamDate] = useState(false);
  const [examDateInput, setExamDateInput] = useState(profile?.exam_date || "");

  // Edição rápida de horas planejadas na própria tabela
  const [inlinePlannedHours, setInlinePlannedHours] = useState<Record<string, string>>({});

  const handleInlinePlannedChange = (id: string, val: string) => {
    setInlinePlannedHours((prev) => ({ ...prev, [id]: val }));
  };

  const handleInlinePlannedSave = async (s: any) => {
    const valStr = inlinePlannedHours[s.id];
    if (valStr === undefined) return;
    const num = Number(valStr);
    if (isNaN(num) || num < 0) return;

    try {
      await updateSubject(s.id, { weight: num / 2 });
      await refreshAllData();
      toast.success(`Horas planejadas de ${s.name} atualizadas para ${num}h!`);
    } catch (e: any) {
      toast.error("Erro ao salvar horas planejadas");
    }
  };

  const openEditSubject = (s: any) => {
    setEditingSubject(s);
    setName(s.name);
    setColor(s.color || "#0284C7");
    setPlannedHours(String((s.weight ? s.weight * 2 : 4)));
    setPages(String(s.pages || 0));
    setPagesRead(String(s.pages_read || 0));
  };

  const saveSubjectChanges = async () => {
    if (!editingSubject) return;
    try {
      const weightVal = (Number(plannedHours) || 0) / 2;
      await updateSubject(editingSubject.id, {
        name: name.trim(),
        color,
        weight: weightVal,
        pages: Number(pages) || 0,
        pages_read: Number(pagesRead) || 0,
      });
      await refreshAllData();
      toast.success("Alterações salvas!");
      setEditingSubject(null);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar matéria");
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta matéria?")) return;
    try {
      await deleteSubject(id);
      await refreshAllData();
      toast.success("Matéria excluída");
      setEditingSubject(null);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir matéria");
    }
  };

  const handleCreateSubject = async () => {
    if (!name.trim()) {
      toast.error("Insira o nome da matéria");
      return;
    }
    try {
      const weightVal = (Number(plannedHours) || 0) / 2;
      await createSubject({
        name: name.trim(),
        color,
        weight: weightVal,
        pages: Number(pages) || 0,
        pages_read: Number(pagesRead) || 0,
      });
      await refreshAllData();
      toast.success("Nova matéria criada!");
      setIsAddingSubject(false);
      setName("");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar matéria");
    }
  };

  const saveGoal = async () => {
    try {
      await updateProfile({ weekly_goal_hours: Number(goalHoursInput) || 28 });
      await refreshAllData();
      toast.success("Meta semanal atualizada!");
      setIsEditingGoal(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar meta");
    }
  };

  const saveExamDate = async () => {
    try {
      await updateProfile({ exam_date: examDateInput || null });
      await refreshAllData();
      toast.success("Data da prova atualizada!");
      setIsEditingExamDate(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar data da prova");
    }
  };

  const COLORS = ["#0284C7", "#7C3AED", "#15803D", "#D97706", "#DC2626", "#059669", "#4F46E5", "#DB2777"];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Olá, {profile?.display_name || "Estudante"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2 font-medium">
            <Target className="w-4 h-4 text-primary" />
            <span>{profile?.exam_name || "Técnico do Seguro Social — INSS"}</span>
            <img 
              src="/inss-logo.jpeg" 
              alt="INSS Logo" 
              className="h-10 w-auto object-contain rounded-md shadow-sm border border-border/40 bg-white p-0.5" 
            />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setName("");
              setColor("#0284C7");
              setPlannedHours("8");
              setPages("100");
              setPagesRead("0");
              setIsAddingSubject(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-primary" /> Nova Matéria
          </Button>
          <Link to="/app/study" className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition shadow-sm text-sm">
            <Clock className="w-4 h-4" /> Registrar Estudo
          </Link>
        </div>
      </div>

      {/* QUADRO DE DESTAQUE PRINCIPAL (CAMPOS SOLICITADOS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Percentual Coberto do Edital */}
        <Card className="p-5 card-elevated border-l-4 border-l-secondary flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-secondary" /> % Coberto do Edital
            </span>
            <Badge variant="secondary" className="text-xs font-bold">
              {totalPdfPagesRead}/{totalPdfPages} pgs
            </Badge>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold tracking-tight text-secondary dark:text-foreground">{totalPdfPct}%</div>
            <Progress value={totalPdfPct} className="h-2 mt-2" />
          </div>
        </Card>

        {/* 2. Horas Estudadas no Dia */}
        <Card className="p-5 card-elevated border-l-4 border-l-secondary flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-secondary" /> Horas Estudadas Hoje
            </span>
            <Badge variant="outline" className="text-[10px]">
              {todaySessions.length} sessões
            </Badge>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold tracking-tight text-secondary dark:text-foreground">{todayHours}h</div>
            <p className="text-[11px] text-muted-foreground mt-1">Registradas hoje</p>
          </div>
        </Card>

        {/* 3. Horas Estudadas na Semana */}
        <Card className="p-5 card-elevated border-l-4 border-l-secondary flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-secondary" /> Horas na Semana
            </span>
            <Badge variant="outline" className="text-[10px]">
              Meta: {goalH}h
            </Badge>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold tracking-tight text-secondary dark:text-foreground">{weekHours}h</div>
            <Progress value={Math.min(100, (weekHours / goalH) * 100)} className="h-2 mt-2" />
          </div>
        </Card>

        {/* 4. Quantidade de Dias para a Prova */}
        <Card
          onClick={() => {
            setExamDateInput(profile?.exam_date || "Pré-edital");
            setIsEditingExamDate(true);
          }}
          className="p-5 card-elevated border-l-4 border-l-secondary flex flex-col justify-between cursor-pointer hover:border-primary/50 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-secondary" /> Dias para a Prova
            </span>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold tracking-tight text-secondary dark:text-foreground">
              {profile?.exam_date === "Pré-edital" || profile?.exam_date === "pre-edital" || !profile?.exam_date ? (
                "Pré-edital"
              ) : daysLeft !== null ? (
                daysLeft >= 0 ? `${daysLeft} dias` : "Prova realizada!"
              ) : (
                "Pré-edital"
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {profile?.exam_date && profile.exam_date !== "Pré-edital" && profile.exam_date !== "pre-edital" && !isNaN(new Date(profile.exam_date + "T00:00:00").getTime())
                ? new Date(profile.exam_date + "T00:00:00").toLocaleDateString("pt-BR")
                : "Fase Pré-edital"}
            </p>
          </div>
        </Card>
      </div>

      {/* SEÇÃO: REVISÕES DO DIA (Ciclo Espaçado: 7, 15, 30 e 60 dias) */}
      <Card className="p-5 card-elevated border-l-4 border-l-primary space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Revisões do Dia
                {dueReviews.length > 0 && (
                  <Badge variant="default" className="text-xs">
                    {dueReviews.length} {dueReviews.length === 1 ? "pendente" : "pendentes"}
                  </Badge>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Revisões programadas para hoje pelo ciclo espaçado (7, 15, 30 e 60 dias).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {dueReviews.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Deseja apagar todas as revisões pendentes?")) {
                    clearOldReviews.mutate();
                  }
                }}
                disabled={clearOldReviews.isPending}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 h-7"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar todas
              </Button>
            )}
            <Link
              to="/app/reviews"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Ver todas →
            </Link>
          </div>
        </div>

        {dueReviews.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dueReviews.map((r: any) => {
              const layerLabel = getReviewLayerLabel(r.layer);
              return (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xl border bg-card/60 hover:bg-muted/30 transition flex flex-col justify-between space-y-3 shadow-sm"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: r.subject?.color || "#0284C7" }}
                        />
                        <span className="truncate">{r.subject?.name}</span>
                      </span>
                      <Badge variant="secondary" className="text-[11px] font-bold shrink-0">
                        {layerLabel}
                      </Badge>
                    </div>
                    {r.topic && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        📝 {r.topic}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-[11px] text-muted-foreground">
                      Data: {r.next_review_date}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => delReview.mutate(r.id)}
                        disabled={delReview.isPending}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Descartar revisão"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => doneReview.mutate({ id: r.id, layer: r.layer })}
                        disabled={doneReview.isPending}
                        className="h-7 text-xs flex items-center gap-1 px-2.5 font-medium hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Fiz
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 px-4 rounded-xl border border-dashed border-border/60 bg-muted/20 text-center flex flex-col items-center justify-center gap-1.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-500/80 mb-1" />
            <p className="text-sm font-semibold text-foreground">Não há revisões a serem feitas</p>
            <p className="text-xs text-muted-foreground">
              Você está em dia com todas as revisões do cronograma de hoje! Novas revisões aparecerão automaticamente quando chegar o dia.
            </p>
          </div>
        )}
      </Card>

      {/* Tabela: Progresso de Leitura de PDFs */}
      <Card className="p-6 card-elevated space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              Progresso de Leitura de PDFs
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tabela sincronizada em tempo real com todos os dados das matérias.
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {totalPdfPct}% Concluído ({totalPdfPagesRead}/{totalPdfPages} pgs)
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                <th className="py-3 px-3">Matéria</th>
                <th className="py-3 px-3 text-right">Páginas Totais</th>
                <th className="py-3 px-3 text-right">Páginas Lidas</th>
                <th className="py-3 px-3 text-right">Páginas Restantes</th>
                <th className="py-3 px-3 text-right">Progresso (%)</th>
                <th className="py-3 px-3 text-right">Horas Leitura (h)</th>
                <th className="py-3 px-3 text-right">Págs/h Total</th>
                <th className="py-3 px-3 text-right">Horas Restantes (h)</th>
                <th className="py-3 px-3 text-center">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pdfProgressData.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition">
                  <td className="py-2.5 px-3 font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 aspect-square" style={{ background: row.color }} />
                      <span>{row.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">{row.totalPages}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{row.pagesRead}</td>
                  <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">{row.pagesRemaining}</td>
                  <td className="py-2.5 px-3 text-right font-bold">{row.pct}%</td>
                  <td className="py-2.5 px-3 text-right">{row.readingHours.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{row.pagsPerHour > 0 ? row.pagsPerHour : "—"}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{row.hoursRemaining > 0 ? `${row.hoursRemaining}h` : "—"}</td>
                  <td className="py-2.5 px-3 text-center">
                    <button onClick={() => openEditSubject(row)} className="p-1 rounded hover:bg-muted" aria-label="Editar">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/60 font-bold border-t">
                <td className="py-3 px-3">TOTAL</td>
                <td className="py-3 px-3 text-right">{totalPdfPages}</td>
                <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">{totalPdfPagesRead}</td>
                <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-400">{totalPdfPagesRemaining}</td>
                <td className="py-3 px-3 text-right text-primary">{totalPdfPct}%</td>
                <td className="py-3 px-3 text-right">{totalPdfReadingHours.toFixed(1)}</td>
                <td className="py-3 px-3 text-right font-mono">{totalPdfPagsPerHour > 0 ? totalPdfPagsPerHour : "—"}</td>
                <td className="py-3 px-3 text-right font-mono text-primary">{totalPdfHoursRemaining > 0 ? `${totalPdfHoursRemaining}h` : "—"}</td>
                <td className="py-3 px-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Grid: Horas Semanais & Gráfico */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 card-elevated lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Horas Semanais por Matéria
              </h2>
              <p className="text-xs text-muted-foreground">
                Edite as horas planejadas diretamente nas células ou clique no lápis ✏️.
              </p>
            </div>
            <Badge variant="outline">Meta: {totalWeeklyPlanned}h / sem</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Matérias</th>
                  <th className="py-2.5 px-3 text-right">Planejadas (h)</th>
                  <th className="py-2.5 px-3 text-right">Feitas (h)</th>
                  <th className="py-2.5 px-3 text-right">Restantes (h)</th>
                  <th className="py-2.5 px-3 text-center">Editar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {weeklySubjectData.map((row) => {
                  const val = inlinePlannedHours[row.id] ?? String(row.planejado);
                  return (
                    <tr key={row.id} className="hover:bg-muted/30 transition">
                      <td className="py-2.5 px-3 font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 aspect-square" style={{ background: row.color }} />
                          <span>{row.name} <span className="text-xs text-muted-foreground font-mono">({row.sigla})</span></span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={val}
                            onChange={(e) => handleInlinePlannedChange(row.id, e.target.value)}
                            onBlur={() => handleInlinePlannedSave(row)}
                            onKeyDown={(e) => e.key === "Enter" && handleInlinePlannedSave(row)}
                            className="w-16 h-8 text-right font-medium text-xs px-1.5 py-0 border-muted"
                          />
                          <span className="text-xs text-muted-foreground">h</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{row.feito.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">{row.restante.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button onClick={() => openEditSubject(row)} className="p-1 rounded hover:bg-muted" aria-label="Editar">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-muted/60 font-bold border-t">
                  <td className="py-3 px-3">TOTAL</td>
                  <td className="py-3 px-3 text-right">{totalWeeklyPlanned.toFixed(1)}</td>
                  <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">{totalWeeklyDone.toFixed(1)}</td>
                  <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-400">{totalWeeklyRemaining.toFixed(1)}</td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Gráfico Comparativo Planejadas vs Feitas */}
        <Card className="p-5 card-elevated flex flex-col justify-between">
          <h3 className="text-base font-bold flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Planejado vs. Feito
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklySubjectData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="sigla" tick={{ fontSize: 11, fontWeight: "600" }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any, name: any) => [`${value}h`, name]}
                  labelFormatter={(sigla: any, items: any[]) => {
                    const item = items && items[0] && items[0].payload;
                    return item ? `${item.name} (${sigla})` : sigla;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="planejado" name="Planejado" fill="#334155" radius={[4, 4, 0, 0]} />
                <Bar dataKey="feito" name="Feito" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Modais de Edição */}
      <Dialog open={!!editingSubject} onOpenChange={(o) => !o && setEditingSubject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Matéria — {editingSubject?.name}</DialogTitle>
            <DialogDescription>
              Altere os dados da matéria. Todos os quadros serão sincronizados automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="subName">Nome da Matéria</Label>
              <Input id="subName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subHours">Horas Planejadas / Semana (h)</Label>
                <Input id="subHours" type="number" min={0} value={plannedHours} onChange={(e) => setPlannedHours(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="subColor">Cor Visual</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input id="subColor" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border" />
                  <span className="text-xs font-mono">{color}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-3">
              <div>
                <Label htmlFor="pdfPages">Páginas Totais (PDF)</Label>
                <Input id="pdfPages" type="number" min={0} value={pages} onChange={(e) => setPages(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="pdfPagesRead">Páginas Lidas</Label>
                <Input id="pdfPagesRead" type="number" min={0} value={pagesRead} onChange={(e) => setPagesRead(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <Button variant="destructive" size="sm" onClick={() => handleDeleteSubject(editingSubject.id)} className="flex items-center gap-1">
              <Trash2 className="w-4 h-4" /> Excluir
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingSubject(null)}>Cancelar</Button>
              <Button onClick={saveSubjectChanges}>Salvar Alterações</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Matéria */}
      <Dialog open={isAddingSubject} onOpenChange={setIsAddingSubject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Matéria</DialogTitle>
            <DialogDescription>
              Cadastre uma nova matéria para o seu planner.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="newName">Nome da Matéria</Label>
              <Input id="newName" placeholder="Ex: Direito Administrativo" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newHours">Horas Planejadas / Semana (h)</Label>
                <Input id="newHours" type="number" min={0} value={plannedHours} onChange={(e) => setPlannedHours(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="newColor">Cor Visual</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input id="newColor" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border" />
                  <span className="text-xs font-mono">{color}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-3">
              <div>
                <Label htmlFor="newPages">Páginas Totais (PDF)</Label>
                <Input id="newPages" type="number" min={0} value={pages} onChange={(e) => setPages(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="newPagesRead">Páginas Lidas</Label>
                <Input id="newPagesRead" type="number" min={0} value={pagesRead} onChange={(e) => setPagesRead(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingSubject(false)}>Cancelar</Button>
            <Button onClick={handleCreateSubject}>Criar Matéria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Meta Semanal */}
      <Dialog open={isEditingGoal} onOpenChange={setIsEditingGoal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Meta Semanal de Horas</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="goalInput">Meta de Horas por Semana (h)</Label>
            <Input id="goalInput" type="number" min={1} max={168} value={goalHoursInput} onChange={(e) => setGoalHoursInput(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingGoal(false)}>Cancelar</Button>
            <Button onClick={saveGoal}>Salvar Meta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Data da Prova */}
      <Dialog open={isEditingExamDate} onOpenChange={setIsEditingExamDate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Data da Prova / Fase do Concurso</DialogTitle>
            <DialogDescription>
              Defina a data prevista da prova ou marque como Pré-edital caso o edital ainda não tenha sido publicado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                type="button"
                variant={examDateInput === "Pré-edital" || !examDateInput ? "default" : "ghost"}
                size="sm"
                onClick={() => setExamDateInput("Pré-edital")}
                className="flex-1 text-xs"
              >
                Pré-edital
              </Button>
              <Button
                type="button"
                variant={examDateInput !== "Pré-edital" && examDateInput ? "default" : "ghost"}
                size="sm"
                onClick={() => setExamDateInput(localDateStr())}
                className="flex-1 text-xs"
              >
                Data Definida
              </Button>
            </div>

            {examDateInput !== "Pré-edital" && examDateInput ? (
              <div>
                <Label htmlFor="examDateInput">Data da Prova</Label>
                <Input
                  id="examDateInput"
                  type="date"
                  value={examDateInput}
                  onChange={(e) => setExamDateInput(e.target.value)}
                  className="mt-1"
                />
              </div>
            ) : (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary font-medium flex items-center gap-2">
                <span>📌 Status: <strong>Pré-edital</strong> (sem data marcada).</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingExamDate(false)}>Cancelar</Button>
            <Button onClick={saveExamDate}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
