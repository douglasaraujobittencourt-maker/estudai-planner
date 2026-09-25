import { localDateStr } from "@/lib/dates";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDueReviews,
  getAllReviews,
  completeReview,
  deleteReview,
  clearAllPendingReviews,
  getReviewLayerLabel,
  getSubjects,
  updateSubject,
  setSubjectStatus,
  logSession,
} from "@/lib/planner-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Brain,
  CheckCircle2,
  BookOpen,
  RotateCcw,
  GraduationCap,
  Calendar,
  Layers,
  Trash2,
  Clock,
  Check,
  PlusCircle,
  Pencil,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/app/reviews")({
  component: ReviewsPage,
});

const MAX_SELECT = 2;

function ReviewsPage() {
  const qc = useQueryClient();
  const today = localDateStr();

  // Mode tab state: "teoria" | "revisao"
  const [activeTab, setActiveTab] = useState<"teoria" | "revisao">("teoria");

  // Queries
  const { data: dueReviews = [] } = useQuery({
    queryKey: ["reviews-due", today],
    queryFn: () => getDueReviews(today),
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ["all-reviews"],
    queryFn: getAllReviews,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: getSubjects,
  });

  // Selection for batch review completion
  const [selected, setSelected] = useState<Record<string, number>>({}); // id -> layer

  const toggle = (id: string, layer: number) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id] != null) {
        delete next[id];
        return next;
      }
      if (Object.keys(next).length >= MAX_SELECT) {
        toast.info(`Você pode revisar até ${MAX_SELECT} matérias simultaneamente.`);
        return prev;
      }
      next[id] = layer;
      return next;
    });
  };

  const done = useMutation({
    mutationFn: ({ id, layer }: { id: string; layer: number }) => completeReview(id, layer),
    onSuccess: () => {
      toast.success("Revisão concluída! 🧠✨");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao concluir revisão"),
  });

  const doneMany = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(selected);
      for (const [id, layer] of entries) {
        await completeReview(id, layer);
      }
    },
    onSuccess: () => {
      toast.success("Revisões concluídas — próximas etapas agendadas!");
      setSelected({});
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao concluir revisões"),
  });

  const delReview = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      toast.success("Revisão descartada.");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao descartar"),
  });

  const clearPending = useMutation({
    mutationFn: () => clearAllPendingReviews(),
    onSuccess: () => {
      toast.success("Todas as revisões pendentes foram limpas!");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao limpar"),
  });

  const delLessonReviews = useMutation({
    mutationFn: async (reviewIds: string[]) => {
      for (const id of reviewIds) {
        await deleteReview(id);
      }
    },
    onSuccess: () => {
      toast.success("Aula e ciclo de revisões excluídos com sucesso!");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao excluir"),
  });

  // Subject status toggle mutation
  const toggleSubjectStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "active" | "finalized" }) => {
      await setSubjectStatus(id, newStatus);
    },
    onSuccess: (_, variables) => {
      if (variables.newStatus === "finalized") {
        toast.success("Matéria marcada como finalizada! Agora está em Modo Revisão 🎓");
      } else {
        toast.success("Matéria retornada para Modo Teoria 📘");
      }
      qc.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao alterar status da matéria"),
  });

  // Modal: Quick questions logging for finalized subjects
  const [quickQuestionModal, setQuickQuestionModal] = useState<{
    open: boolean;
    subjectId: string;
    subjectName: string;
  }>({ open: false, subjectId: "", subjectName: "" });

  const [quickDone, setQuickDone] = useState("20");
  const [quickCorrect, setQuickCorrect] = useState("18");
  const [quickMinutes, setQuickMinutes] = useState("30");

  const saveQuickQuestions = useMutation({
    mutationFn: async () => {
      const qDone = Number(quickDone) || 0;
      const qCorr = Number(quickCorrect) || 0;
      const mins = Number(quickMinutes) || 1;
      await logSession({
        subject_id: quickQuestionModal.subjectId,
        kind: "questoes",
        minutes: mins,
        questions_done: qDone,
        questions_correct: qCorr,
        notes: `Revisão por questões (${qDone} questões)`,
      });
    },
    onSuccess: () => {
      toast.success("Questões de revisão registradas com sucesso! 🔥");
      setQuickQuestionModal({ open: false, subjectId: "", subjectName: "" });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar"),
  });

  // Modal: Edit weekly questions goal
  const [goalModal, setGoalModal] = useState<{
    open: boolean;
    subjectId: string;
    subjectName: string;
    currentGoal: number;
  }>({ open: false, subjectId: "", subjectName: "", currentGoal: 50 });

  const [newGoalInput, setNewGoalInput] = useState("50");

  const saveNewGoal = useMutation({
    mutationFn: async () => {
      await updateSubject(goalModal.subjectId, {
        maintenance_weekly_questions_goal: Number(newGoalInput) || 50,
      });
    },
    onSuccess: () => {
      toast.success("Meta semanal de questões atualizada!");
      setGoalModal({ open: false, subjectId: "", subjectName: "", currentGoal: 50 });
      qc.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar meta"),
  });

  // Group all reviews by topic & subject to present lesson summary
  type LessonGroup = {
    key: string;
    subjectName: string;
    subjectColor: string;
    topic: string;
    reviews: any[];
  };

  const lessonGroups: LessonGroup[] = [];
  const groupMap = new Map<string, LessonGroup>();

  allReviews.forEach((r: any) => {
    const key = `${r.subject_id}_${r.topic || "Geral"}`;
    if (!groupMap.has(key)) {
      const g: LessonGroup = {
        key,
        subjectName: r.subject?.name || "Sem Matéria",
        subjectColor: r.subject?.color || "#0284C7",
        topic: r.topic || "Aula / Conteúdo sem descrição",
        reviews: [],
      };
      groupMap.set(key, g);
      lessonGroups.push(g);
    }
    groupMap.get(key)!.reviews.push(r);
  });

  const finalizedSubjects = subjects.filter((s) => s.study_status === "finalized");
  const activeSubjects = subjects.filter((s) => s.study_status !== "finalized");

  const selectedCount = Object.keys(selected).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2.5">
            <Brain className="w-7 h-7 text-primary" /> Revisões
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestão inteligente de estudos: acompanhe as aulas do Modo Teoria e as matérias em Modo Revisão.
          </p>
        </div>

        <Link
          to="/app/study"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition text-sm shadow-sm shrink-0"
        >
          <Clock className="w-4 h-4" /> Bora Estudar
        </Link>
      </div>

      {/* Navegação entre os 2 Modos */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-2xl border border-border/40">
        <button
          onClick={() => setActiveTab("teoria")}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === "teoria"
              ? "bg-card text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="w-4 h-4 text-sky-500" />
          <span>Modo Teoria</span>
          {dueReviews.length > 0 && (
            <Badge variant="default" className="text-[11px] h-5 px-1.5 font-bold">
              {dueReviews.length}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("revisao")}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === "revisao"
              ? "bg-card text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <GraduationCap className="w-4 h-4 text-emerald-500" />
          <span>Modo Revisão</span>
          {finalizedSubjects.length > 0 && (
            <Badge variant="secondary" className="text-[11px] h-5 px-1.5 font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              {finalizedSubjects.length} {finalizedSubjects.length === 1 ? "matéria" : "matérias"}
            </Badge>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: REVISÕES - MODO TEORIA                                             */}
      {/* ========================================================================= */}
      {activeTab === "teoria" && (
        <div className="space-y-6">
          {/* Card de Revisões de Hoje / Pendentes */}
          <Card className="p-6 card-elevated space-y-4 border-l-4 border-l-primary">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-primary" />
                  Revisões de Hoje (Ciclo Espaçado)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Revisões programadas para hoje pelo ciclo <strong>7, 15, 30 e 60 dias</strong> das aulas finalizadas. Selecione até {MAX_SELECT} para revisar juntas.
                </p>
              </div>

              {dueReviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Deseja limpar todas as revisões pendentes?")) {
                        clearPending.mutate();
                      }
                    }}
                    disabled={clearPending.isPending}
                    className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Limpar todas
                  </Button>
                </div>
              )}
            </div>

            {/* Barra de ação em lote */}
            {selectedCount > 0 && (
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between flex-wrap gap-3">
                <div className="text-xs sm:text-sm font-semibold text-foreground">
                  ✨ <strong>{selectedCount}/{MAX_SELECT}</strong> matéria(s) selecionada(s) para revisar juntas
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setSelected({})}>
                    Desmarcar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => doneMany.mutate()}
                    disabled={doneMany.isPending}
                    className="flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Concluir seleção
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de revisões pendentes */}
            {dueReviews.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-2xl bg-muted/20 space-y-2">
                <div className="text-3xl">🎉</div>
                <h3 className="text-base font-bold">Tudo em dia por hoje!</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Nenhuma revisão pendente para hoje. Quando você concluir aulas em <strong>"Bora Estudar"</strong> marcando a opção <em>"Aula finalizada"</em>, as revisões em 7, 15, 30 e 60 dias aparecerão aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {dueReviews.map((r: any) => {
                  const isChecked = selected[r.id] != null;
                  const atLimit = !isChecked && selectedCount >= MAX_SELECT;
                  const layerLabel = getReviewLayerLabel(r.layer);

                  return (
                    <Card
                      key={r.id}
                      className={`p-4 card-elevated flex items-start gap-3 transition-all ${
                        isChecked ? "ring-2 ring-primary bg-primary/5" : ""
                      } ${atLimit ? "opacity-60" : ""}`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggle(r.id, r.layer)}
                        disabled={atLimit}
                        className="mt-1"
                      />
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                        style={{ background: r.subject?.color || "#0284C7" }}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-sm truncate">{r.subject?.name}</span>
                          <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
                            {layerLabel}
                          </Badge>
                        </div>
                        {r.topic && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            📝 {r.topic}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                          <span>Data: {r.next_review_date}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => delReview.mutate(r.id)}
                              disabled={delReview.isPending}
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              title="Descartar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => done.mutate({ id: r.id, layer: r.layer })}
                              disabled={done.isPending}
                              className="h-6 text-xs px-2 hover:bg-emerald-500/10 hover:text-emerald-600"
                            >
                              <Check className="w-3 h-3 mr-1 text-emerald-600" /> Fiz
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Seção: Todas as Aulas Registradas e Cronograma Completo */}
          <Card className="p-6 card-elevated space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Aulas e Tópicos Finalizados (Cronograma Geral)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Histórico de todas as aulas que já tiveram o ciclo de revisões disparado.
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {lessonGroups.length} {lessonGroups.length === 1 ? "aula registrada" : "aulas registradas"}
              </Badge>
            </div>

            {lessonGroups.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-2xl bg-muted/10 space-y-2">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto" />
                <h3 className="text-sm font-semibold">Nenhuma aula finalizada ainda</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Ao estudar em <strong>"Bora Estudar"</strong>, marque a opção <em>"Aula / Conteúdo finalizado?"</em> ao concluir uma aula ou PDF para ela aparecer aqui com todo o seu cronograma de 7, 15, 30 e 60 dias.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lessonGroups.map((group) => {
                  const sortedRev = [...group.reviews].sort((a, b) => a.layer - b.layer);
                  return (
                    <div
                      key={group.key}
                      className="p-4 rounded-xl border border-border/70 bg-card/60 hover:bg-muted/20 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 aspect-square mt-0.5"
                            style={{ background: group.subjectColor }}
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                              {group.subjectName}
                            </span>
                            <h4 className="text-sm font-bold text-foreground truncate">{group.topic}</h4>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Deseja excluir a aula "${group.topic}" e todas as suas revisões?`)) {
                              delLessonReviews.mutate(group.reviews.map((r: any) => r.id));
                            }
                          }}
                          disabled={delLessonReviews.isPending}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 flex items-center gap-1.5"
                          title="Excluir esta aula e todo o ciclo de revisões"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Excluir aula</span>
                        </Button>
                      </div>

                      {/* Etapas do ciclo (7, 15, 30, 60 dias) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40">
                        {[1, 2, 3, 4].map((layerNum) => {
                          const rev = sortedRev.find((r) => r.layer === layerNum);
                          const days = layerNum === 1 ? 7 : layerNum === 2 ? 15 : layerNum === 3 ? 30 : 60;

                          if (!rev) {
                            return (
                              <div
                                key={layerNum}
                                className="p-2 rounded-lg bg-muted/40 border border-dashed border-border/60 text-center"
                              >
                                <span className="text-[10px] font-semibold text-muted-foreground block">
                                  {days} dias
                                </span>
                                <span className="text-[11px] text-muted-foreground">Não gerado</span>
                              </div>
                            );
                          }

                          const isDone = rev.done;
                          const isTodayOrPast = rev.next_review_date <= today;

                          return (
                            <div
                              key={layerNum}
                              className={`p-2 rounded-lg border text-center transition relative group ${
                                isDone
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                                  : isTodayOrPast
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-semibold"
                                  : "bg-card border-border text-muted-foreground"
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                                {isDone ? (
                                  <>
                                    <Check className="w-3 h-3" /> Feita
                                  </>
                                ) : (
                                  <>
                                    <Calendar className="w-3 h-3" /> {days} dias
                                  </>
                                )}
                              </div>
                              <span className="text-[11px] block mt-0.5 font-medium truncate">
                                {rev.next_review_date}
                              </span>
                              <button
                                onClick={() => {
                                  if (confirm(`Deseja excluir a etapa de revisão de ${days} dias (${rev.next_review_date})?`)) {
                                    delReview.mutate(rev.id);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 transition absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-destructive text-destructive-foreground shadow hover:scale-110"
                                title="Excluir esta etapa de revisão"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: MODO REVISÃO (MATÉRIAS FINALIZADAS)                                 */}
      {/* ========================================================================= */}
      {activeTab === "revisao" && (
        <div className="space-y-6">
          {/* Matérias em Modo Revisão */}
          <Card className="p-6 card-elevated space-y-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-emerald-500" />
                  Matérias em Modo Revisão (Teoria Concluída)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Matérias que já foram finalizadas e agora estão em <strong>manutenção contínua através de resolução de questões</strong>.
                </p>
              </div>

              <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                {finalizedSubjects.length} {finalizedSubjects.length === 1 ? "matéria ativa" : "matérias ativas"}
              </Badge>
            </div>

            {finalizedSubjects.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-2xl bg-muted/20 space-y-3">
                <div className="text-3xl">📚</div>
                <h3 className="text-base font-bold">Nenhuma matéria em Modo Revisão ainda</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Quando você terminar a teoria de uma matéria (em <em>"Bora Estudar"</em> ou na lista abaixo), marque-a como <strong>Finalizada</strong>. Ela passará automaticamente para cá para você focar nas metas de questões semanais!
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {finalizedSubjects.map((s) => {
                  const goal = s.maintenance_weekly_questions_goal || 50;
                  const current = s.maintenance_questions_this_week || 0;
                  const pct = Math.min(100, Math.round((current / goal) * 100));

                  return (
                    <Card
                      key={s.id}
                      className="p-5 card-elevated border bg-card/80 space-y-4 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                            style={{ background: s.color || "#0284C7" }}
                          />
                          <div>
                            <h3 className="font-bold text-base text-foreground leading-tight">
                              {s.name}
                            </h3>
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Teoria 100% Finalizada
                            </span>
                          </div>
                        </div>

                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                          Revisão Contínua
                        </Badge>
                      </div>

                      {/* Progresso de Questões da Semana */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border/40">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                            Questões nesta semana:
                          </span>
                          <span className="font-bold text-foreground">
                            {current} / {goal} ({pct}%)
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>

                      {/* Dados totais */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                        <div>
                          📖 Total de Páginas: <strong className="text-foreground">{s.pages_read}</strong>
                        </div>
                        <div>
                          ✍️ Questões Totais: <strong className="text-foreground">{s.total_questions || 0}</strong>
                        </div>
                      </div>

                      {/* Ações rápidas */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setGoalModal({
                              open: true,
                              subjectId: s.id,
                              subjectName: s.name,
                              currentGoal: goal,
                            });
                            setNewGoalInput(String(goal));
                          }}
                          className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-3 h-3 mr-1" /> Meta: {goal}q/sem
                        </Button>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Deseja retornar "${s.name}" para o Modo Teoria?`)) {
                                toggleSubjectStatus.mutate({ id: s.id, newStatus: "active" });
                              }
                            }}
                            className="text-xs h-8 px-2 text-muted-foreground hover:text-amber-600"
                            title="Voltar para Modo Teoria"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" /> Voltar p/ Teoria
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => {
                              setQuickQuestionModal({
                                open: true,
                                subjectId: s.id,
                                subjectName: s.name,
                              });
                            }}
                            className="text-xs h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            <PlusCircle className="w-3.5 h-3.5 mr-1" /> + Questões
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Matérias em Modo Teoria (Opção rápida para finalizar) */}
          {activeSubjects.length > 0 && (
            <Card className="p-6 card-elevated space-y-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sky-500" />
                  Matérias em Modo Teoria ({activeSubjects.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Estas matérias ainda estão na fase de leitura e teoria. Quando terminar a teoria de qualquer uma delas, você pode marcá-la como finalizada aqui ou na tela "Bora Estudar".
                </p>
              </div>

              <div className="divide-y divide-border/50 border rounded-xl overflow-hidden bg-card/40">
                {activeSubjects.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 flex items-center justify-between flex-wrap gap-2 hover:bg-muted/30 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: s.color || "#0284C7" }}
                      />
                      <span className="font-semibold text-sm truncate">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({s.pages_read}/{s.pages || 0} pgs)
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleSubjectStatus.mutate({ id: s.id, newStatus: "finalized" })}
                      disabled={toggleSubjectStatus.isPending}
                      className="text-xs h-8 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
                    >
                      <GraduationCap className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                      Marcar como Finalizada
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modal: Registro Rápido de Questões de Revisão */}
      <Dialog
        open={quickQuestionModal.open}
        onOpenChange={(o) =>
          !o && setQuickQuestionModal({ open: false, subjectId: "", subjectName: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Questões de Revisão</DialogTitle>
            <DialogDescription>
              Adicione as questões feitas para a matéria{" "}
              <strong>{quickQuestionModal.subjectName}</strong>. O total da semana será atualizado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="qDone">Questões Feitas</Label>
                <Input
                  id="qDone"
                  type="number"
                  min={1}
                  value={quickDone}
                  onChange={(e) => setQuickDone(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="qCorrect">Questões Corretas</Label>
                <Input
                  id="qCorrect"
                  type="number"
                  min={0}
                  value={quickCorrect}
                  onChange={(e) => setQuickCorrect(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="qMins">Tempo Gasto (minutos)</Label>
              <Input
                id="qMins"
                type="number"
                min={1}
                value={quickMinutes}
                onChange={(e) => setQuickMinutes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setQuickQuestionModal({ open: false, subjectId: "", subjectName: "" })
              }
            >
              Cancelar
            </Button>
            <Button
              onClick={() => saveQuickQuestions.mutate()}
              disabled={saveQuickQuestions.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Salvar Questões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Ajustar Meta Semanal de Questões */}
      <Dialog
        open={goalModal.open}
        onOpenChange={(o) =>
          !o && setGoalModal({ open: false, subjectId: "", subjectName: "", currentGoal: 50 })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Meta Semanal de Questões</DialogTitle>
            <DialogDescription>
              Defina a quantidade semanal de questões que você deseja resolver para{" "}
              <strong>{goalModal.subjectName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="newGoal">Meta Semanal (Questões / Semana)</Label>
            <Input
              id="newGoal"
              type="number"
              min={5}
              step={5}
              value={newGoalInput}
              onChange={(e) => setNewGoalInput(e.target.value)}
              className="mt-1"
            />
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setGoalModal({ open: false, subjectId: "", subjectName: "", currentGoal: 50 })
              }
            >
              Cancelar
            </Button>
            <Button onClick={() => saveNewGoal.mutate()} disabled={saveNewGoal.isPending}>
              Salvar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
