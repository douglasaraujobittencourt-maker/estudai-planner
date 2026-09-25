import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Repeat, Layers, CheckCircle2, ArrowRightCircle, Plus, Minus, PenTool, Play, Trophy, AlertCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { localDateStr, addDaysStr } from "@/lib/dates";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/app/cycle")({
  component: CyclePage,
});

function CyclePage() {
  const qc = useQueryClient();

  // Fetch active cycle slots first to help map statuses if columns are missing
  const { data: cycle = [], refetch: refetchCycle } = useQuery({
    queryKey: ["cycle-slots"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cycle_slots")
        .select("*, subject:subjects(*)")
        .order("ord");
      return data ?? [];
    },
  });

  // Fetch all subjects with block details (resilient to missing columns)
  const { data: subjects = [], refetch: refetchSubjects } = useQuery({
    queryKey: ["subjects-blocks", cycle.map((c: any) => c.subject_id).join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*");
      
      if (error || !data) return [];

      const activeIds = new Set(cycle.map((slot: any) => slot.subject_id));

      const groupsMap: Record<string, any> = {
        "Língua Portuguesa": { block: 1, order: 1, color: "#38BDF8", subNames: ["Língua Portuguesa"] },
        "Noções de Direito Administrativo e Lei Complementar nº 840/2011": { block: 1, order: 2, color: "#38BDF8", subNames: ["Direito Administrativo", "Lei dos Servidores (LC 840)", "Noções de Direito Administrativo e Lei Complementar nº 840/2011"] },
        "Fundamentos, Organização, Gestão e Marcos Operacionais do SUAS": { block: 1, order: 3, color: "#A78BFA", subNames: ["Marcos Operacionais do SUAS", "Programas e Benefícios Socioassistenciais do DF", "Fundamentos, Organização, Gestão e Marcos Operacionais do SUAS"] },
        "Noções de Direito Constitucional": { block: 2, order: 4, color: "#38BDF8", subNames: ["Direito Constitucional", "Noções de Direito Constitucional"] },
        "Redação (Prova Discursiva)": { block: 2, order: 5, color: "#A78BFA", subNames: ["Redação", "Redação (Prova Discursiva)"] },
        "Arquivologia e Rotinas Administrativas": { block: 2, order: 6, color: "#34D399", subNames: ["Arquivologia", "Cuidados e Rotinas Administrativas", "Arquivologia e Rotinas Administrativas"] },
        "Noções de Recursos Materiais, Patrimônio e Compras": { block: 3, order: 7, color: "#34D399", subNames: ["Gestão de Materiais", "Licitações", "Noções de Recursos Materiais, Patrimônio e Compras"] },
        "Conhecimentos do Distrito Federal (Realidade do DF, RIDE, PDPM, LODF, Lei nº 7.484/2004, Noções de primeiros socorros)": { block: 3, order: 8, color: "#38BDF8", subNames: ["Realidade do DF e RIDE", "Lei Orgânica do DF (Título VI)", "PDPM (II Plano)", "Carreira Pública de AS do DF (Lei 7.484)", "Primeiros Socorros", "Conhecimentos do Distrito Federal (Realidade do DF, RIDE, PDPM, LODF, Lei nº 7.484/2004, Noções de primeiros socorros)"] },
        "Lei Maria da Penha": { block: 4, order: 9, color: "#38BDF8", subNames: ["Lei Maria da Penha"] },
      };

      const processed = Object.entries(groupsMap).map(([groupName, config]: [string, any]) => {
        const matchingSubjects = data.filter((s: any) => config.subNames.includes(s.name));
        
        let id = matchingSubjects[0]?.id || groupName;
        let pages = matchingSubjects.reduce((acc: number, s: any) => acc + (s.pages || 0), 0);
        let pages_read = matchingSubjects.reduce((acc: number, s: any) => acc + (s.pages_read || 0), 0);
        let total_questions = matchingSubjects.reduce((acc: number, s: any) => acc + (s.total_questions || 0), 0);
        let maintenance_questions_this_week = matchingSubjects.reduce((acc: number, s: any) => acc + (s.maintenance_questions_this_week || 0), 0);
        let maintenance_weekly_questions_goal = matchingSubjects.reduce((acc: number, s: any) => acc + (s.maintenance_weekly_questions_goal || 0), 0) || 50;

        // Status logic — dirigido exclusivamente pelo study_status escolhido na Lista Global
        let status = "pending";
        const hasActive = matchingSubjects.some((s: any) => s.study_status === "active");
        const hasFinalized = matchingSubjects.some((s: any) => s.study_status === "finalized");

        if (hasActive) {
          status = "active";
        } else if (hasFinalized) {
          status = "finalized";
        }


        return {
          id,
          name: groupName,
          color: config.color,
          pages: pages || 50,
          pages_read: pages_read || 0,
          total_questions: total_questions || 100,
          study_block: config.block,
          queue_order: config.order,
          study_status: status,
          maintenance_weekly_questions_goal,
          maintenance_questions_this_week,
        };
      });

      return processed.sort((a: any, b: any) => a.queue_order - b.queue_order);
    },
  });

  // Calculate current week sessions of kind "redacao"
  const now = new Date();
  const dow = now.getDay();
  const daysSinceMonday = (dow + 6) % 7;
  const weekStart = addDaysStr(-daysSinceMonday);
  const today = localDateStr();

  const { data: weekSessions = [] } = useQuery({
    queryKey: ["week-redacoes", weekStart, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("study_sessions")
        .select("*, subject:subjects(*)")
        .eq("kind", "redacao")
        .gte("session_date", weekStart)
        .lte("session_date", today);
      return data ?? [];
    },
  });

  const activeSubjects = subjects.filter((s: any) => s.study_status === "active");
  const finalizedSubjects = subjects.filter((s: any) => s.study_status === "finalized");
  const pendingSubjects = subjects.filter((s: any) => s.study_status === "pending");

  const redactionSubject = subjects.find((s: any) => s.name === "Redação (Prova Discursiva)");
  const isRedactionActive = redactionSubject?.study_status === "active";
  const essaysWrittenThisWeek = weekSessions.length;

  const blocks = [
    { n: 1, title: "Bloco 1", subtitle: "Fundamentação Crítica", desc: "Foco inicial nas matérias básicas e específicas prioritárias." },
    { n: 2, title: "Bloco 2", subtitle: "Constitucional & Específicas 2", desc: "Introdução da Redação semanal e temas de nível médio/alto." },
    { n: 3, title: "Bloco 3", subtitle: "Legislação & RIDE", desc: "Legislações distritais e realidade histórica/geográfica do DF." },
    { n: 4, title: "Bloco 4", subtitle: "Consolidação Final", desc: "Fechamento do edital com LODF e Primeiros Socorros." },
  ];

  // Finalize subject function
  const handleFinalize = async (subjectId: string, name: string) => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const subNamesMap: Record<string, string[]> = {
        "Língua Portuguesa": ["Língua Portuguesa"],
        "Noções de Direito Administrativo e Lei Complementar nº 840/2011": ["Direito Administrativo", "Lei dos Servidores (LC 840)", "Noções de Direito Administrativo e Lei Complementar nº 840/2011"],
        "Fundamentos, Organização, Gestão e Marcos Operacionais do SUAS": ["Marcos Operacionais do SUAS", "Programas e Benefícios Socioassistenciais do DF", "Fundamentos, Organização, Gestão e Marcos Operacionais do SUAS"],
        "Noções de Direito Constitucional": ["Direito Constitucional", "Noções de Direito Constitucional"],
        "Redação (Prova Discursiva)": ["Redação", "Redação (Prova Discursiva)"],
        "Arquivologia e Rotinas Administrativas": ["Arquivologia", "Cuidados e Rotinas Administrativas", "Arquivologia e Rotinas Administrativas"],
        "Noções de Recursos Materiais, Patrimônio e Compras": ["Gestão de Materiais", "Licitações", "Noções de Recursos Materiais, Patrimônio e Compras"],
        "Conhecimentos do Distrito Federal (Realidade do DF, RIDE, PDPM, LODF, Lei nº 7.484/2004, Noções de primeiros socorros)": ["Realidade do DF e RIDE", "Lei Orgânica do DF (Título VI)", "PDPM (II Plano)", "Carreira Pública de AS do DF (Lei 7.484)", "Primeiros Socorros", "Conhecimentos do Distrito Federal (Realidade do DF, RIDE, PDPM, LODF, Lei nº 7.484/2004, Noções de primeiros socorros)"],
        "Lei Maria da Penha": ["Lei Maria da Penha"],
      };

      const subNames = subNamesMap[name] || [name];

      // 1. Update status of all matching subjects to finalized
      await supabase
        .from("subjects")
        .update({ study_status: "finalized", pages_read: 100 })
        .in("name", subNames);

      // 2. Remove from cycle slots
      const { data: dbSubjects } = await supabase.from("subjects").select("id").in("name", subNames);
      if (dbSubjects) {
        const ids = dbSubjects.map(s => s.id);
        await supabase
          .from("cycle_slots")
          .delete()
          .in("subject_id", ids);
      }

      // 3. Find the next pending subject in the global queue
      const nextPending = pendingSubjects[0];

      if (nextPending) {
        const nextSubNames = subNamesMap[nextPending.name] || [nextPending.name];
        // Set next to active
        await supabase
          .from("subjects")
          .update({ study_status: "active" })
          .in("name", nextSubNames);

        // Add to cycle slots
        const { data: nextDbSubjects } = await supabase.from("subjects").select("id").in("name", nextSubNames);
        if (nextDbSubjects) {
          for (const sub of nextDbSubjects) {
            const lastSlot = cycle[cycle.length - 1];
            const nextOrd = lastSlot ? lastSlot.ord + 1 : 0;
            await supabase.from("cycle_slots").insert({
              user_id: u.user.id,
              subject_id: sub.id,
              ord: nextOrd,
              hours_per_cycle: 1,
              done_hours: 0
            });
          }
        }

        toast.success(`Parabéns! ${name} concluída. ${nextPending.name} foi ativada no ciclo! 🎉`);
      } else {
        toast.success(`Parabéns! ${name} concluída. Não há mais matérias pendentes na fila! 🏆`);
      }

      refetchSubjects();
      refetchCycle();
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["cycle"] });
      qc.invalidateQueries({ queryKey: ["cycle-slots"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao concluir matéria");
    }
  };

  // Adjust maintenance questions manually
  const adjustQuestions = async (subjectId: string, amount: number) => {
    const sub = finalizedSubjects.find((s: any) => s.id === subjectId);
    if (!sub) return;
    const newVal = Math.max(0, sub.maintenance_questions_this_week + amount);
    await supabase
      .from("subjects")
      .update({ maintenance_questions_this_week: newVal })
      .eq("id", subjectId);
    refetchSubjects();
  };

  const updateStatus = async (groupName: string, newStatus: string) => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const subNamesMap: Record<string, string[]> = {
        "Língua Portuguesa": ["Língua Portuguesa"],
        "Noções de Direito Administrativo e Lei Complementar nº 840/2011": ["Direito Administrativo", "Lei dos Servidores (LC 840)", "Noções de Direito Administrativo e Lei Complementar nº 840/2011"],
        "Fundamentos, Organização, Gestão e Marcos Operacionais do SUAS": ["Marcos Operacionais do SUAS", "Programas e Benefícios Socioassistenciais do DF", "Fundamentos, Organização, Gestão e Marcos Operacionais do SUAS"],
        "Noções de Direito Constitucional": ["Direito Constitucional", "Noções de Direito Constitucional"],
        "Redação (Prova Discursiva)": ["Redação", "Redação (Prova Discursiva)"],
        "Arquivologia e Rotinas Administrativas": ["Arquivologia", "Cuidados e Rotinas Administrativas", "Arquivologia e Rotinas Administrativas"],
        "Noções de Recursos Materiais, Patrimônio e Compras": ["Gestão de Materiais", "Licitações", "Noções de Recursos Materiais, Patrimônio e Compras"],
        "Conhecimentos do Distrito Federal (Realidade do DF, RIDE, PDPM, LODF, Lei nº 7.484/2004, Noções de primeiros socorros)": ["Realidade do DF e RIDE", "Lei Orgânica do DF (Título VI)", "PDPM (II Plano)", "Carreira Pública de AS do DF (Lei 7.484)", "Primeiros Socorros", "Conhecimentos do Distrito Federal (Realidade do DF, RIDE, PDPM, LODF, Lei nº 7.484/2004, Noções de primeiros socorros)"],
        "Lei Maria da Penha": ["Lei Maria da Penha"],
      };

      const subNames = subNamesMap[groupName] || [groupName];

      await supabase
        .from("subjects")
        .update({ study_status: newStatus })
        .in("name", subNames);

      if (newStatus === "active") {
        const { data: dbSubjects } = await supabase.from("subjects").select("id, name").in("name", subNames);
        if (dbSubjects) {
          for (const sub of dbSubjects) {
            const exists = cycle.some((slot: any) => slot.subject_id === sub.id);
            if (!exists) {
              const lastSlot = cycle[cycle.length - 1];
              const nextOrd = lastSlot ? lastSlot.ord + 1 : 0;
              await supabase.from("cycle_slots").insert({
                user_id: u.user.id,
                subject_id: sub.id,
                ord: nextOrd,
                hours_per_cycle: 1,
                done_hours: 0
              });
            }
          }
        }
      } else {
        const { data: dbSubjects } = await supabase.from("subjects").select("id").in("name", subNames);
        if (dbSubjects) {
          const ids = dbSubjects.map(s => s.id);
          await supabase.from("cycle_slots").delete().in("subject_id", ids);
        }
      }

      toast.success(
        newStatus === "active"
          ? `"${groupName}" movida para o Modo Teoria`
          : newStatus === "finalized"
            ? `"${groupName}" movida para o Modo Revisão`
            : `"${groupName}" voltou para a fila (Aguardando)`
      );

      refetchSubjects();
      refetchCycle();
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["cycle"] });
      qc.invalidateQueries({ queryKey: ["cycle-slots"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar status");
    }
  };

  return (
    <div className="px-4 py-4 pb-24 sm:p-6 md:pb-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Repeat className="w-6 h-6 text-primary" /> Panorama Geral do Ciclo de Estudos
          </h1>
          <p className="text-muted-foreground text-sm">
            Visualize o progresso por blocos, as matérias ativas em estudo, a fila do edital e as disciplinas em manutenção por questões.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/20 text-primary-foreground border border-primary/30 px-3 py-1 text-xs">
            {activeSubjects.length} Matérias Ativas
          </Badge>
          <Badge className="bg-success/20 text-success-foreground border border-success/30 px-3 py-1 text-xs">
            {finalizedSubjects.length} Concluídas
          </Badge>
        </div>
      </div>

      {/* Redação Banner */}
      {isRedactionActive && (
        <Card className="p-5 border-primary/40 bg-gradient-to-r from-primary/10 via-card to-card card-elevated flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <PenTool className="w-5 h-5" />
              <span>✍️ Redação da Semana (Meta Ativa)</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Você alcançou o bloco de redações! Cumpra a meta de produzir 1 redação por semana.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-sm font-semibold">{essaysWrittenThisWeek} de 1 redações</div>
              <div className="text-xs text-muted-foreground">esta semana (seg–dom)</div>
            </div>
            <Badge className={essaysWrittenThisWeek > 0 ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
              {essaysWrittenThisWeek > 0 ? "Meta Batida" : "Pendente"}
            </Badge>
            <Link
              to="/app/study"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Fazer Redação
            </Link>
          </div>
        </Card>
      )}

      {/* Active and Maintenance sections */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active subjects */}
        <Card className="p-5 card-elevated flex flex-col justify-between">
          <div>
            <h2 className="font-semibold text-lg mb-1 flex items-center gap-2 text-primary">
              <Play className="w-5 h-5 fill-primary" /> Modo Teoria
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Matérias que você está alternando no momento. Estude em blocos e finalize quando esgotar o edital.
            </p>
            {activeSubjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground italic text-sm">
                Nenhuma matéria ativa. Adicione matérias para iniciar os estudos do Bloco 1.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {activeSubjects.map((s: any) => {
                  const cycleSlot = cycle.find((slot: any) => slot.subject_id === s.id);
                  const pct = s.pages ? Math.min(100, Math.round(((s.pages_read ?? 0) / s.pages) * 100)) : 0;
                  return (
                    <div key={s.id} className="p-4 rounded-lg border border-border bg-card/60 flex flex-col justify-between border-l-4 hover:border-l-primary transition-all" style={{ borderLeftColor: s.color }}>
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-semibold text-sm line-clamp-1" title={s.name}>{s.name}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Progresso: {s.pages_read ?? 0}/{s.pages} pg ({pct}%)
                        </div>
                        <Progress value={pct} className="h-1 mt-1.5" />
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-4 pt-2 border-t border-border/40">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {cycleSlot ? `${cycleSlot.done_hours}h líquidas` : "Aguardando"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs hover:bg-success/15 hover:text-success-foreground text-success-foreground font-semibold flex items-center gap-1"
                          onClick={() => handleFinalize(s.id, s.name)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Maintenance / Revision */}
        <Card className="p-5 card-elevated flex flex-col justify-between">
          <div>
            <h2 className="font-semibold text-lg mb-1 flex items-center gap-2 text-success">
              <Trophy className="w-5 h-5" /> Modo revisão
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Disciplinas finalizadas. Resolva questões periodicamente para manter a retenção dos assuntos.
            </p>
            {finalizedSubjects.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground italic flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-lg">
                <AlertCircle className="w-6 h-6 text-muted-foreground/60" />
                <span>Nenhuma matéria concluída para manutenção.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {finalizedSubjects.map((s: any) => {
                  const pct = Math.min(100, Math.round((s.maintenance_questions_this_week / s.maintenance_weekly_questions_goal) * 100));
                  return (
                    <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card/40 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                          <span className="font-medium text-xs truncate">{s.name}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Progress value={pct} className="h-1 flex-1" />
                          <span className="text-[10px] font-mono text-muted-foreground w-12 text-right">
                            {s.maintenance_questions_this_week}/{s.maintenance_weekly_questions_goal} q
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="outline" className="w-6 h-6" onClick={() => adjustQuestions(s.id, -5)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="outline" className="w-6 h-6" onClick={() => adjustQuestions(s.id, 5)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Badge className={`text-[9px] px-1.5 py-0.5 ${pct >= 100 ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                          {pct >= 100 ? "Revisada" : "Pendente"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Global workflow timeline - 4 columns block panorama */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ArrowRightCircle className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg">Fila Global e Sequência de Importância</h2>
        </div>

        <Card className="p-5 card-elevated">
          <div className="space-y-2">
            {subjects.map((s: any) => {
              let statusBadge = (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/20 text-muted-foreground border-border/40 shrink-0">
                  Pendente
                </Badge>
              );
              let itemBg = "bg-card/30 border-dashed";
              
              if (s.study_status === "active") {
                statusBadge = (
                  <Badge className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary-foreground border border-primary/30 animate-pulse shrink-0">
                    Em estudo
                  </Badge>
                );
                itemBg = "bg-primary/5 border-primary/20";
              } else if (s.study_status === "finalized") {
                statusBadge = (
                  <Badge className="text-[10px] px-2 py-0.5 bg-success/20 text-success-foreground border border-success/30 shrink-0">
                    Concluída
                  </Badge>
                );
                itemBg = "bg-success/5 border-success/15";
              }

              return (
                <div key={s.id} className={`p-3 rounded-lg border text-sm flex items-center justify-between gap-4 ${itemBg}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="font-medium text-foreground leading-snug">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {statusBadge}
                    <select
                      value={s.study_status}
                      onChange={(e) => updateStatus(s.name, e.target.value)}
                      className="bg-muted text-muted-foreground border border-border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer font-medium"
                    >
                      <option value="pending" className="bg-card">Aguardando</option>
                      <option value="active" className="bg-card">Em estudo</option>
                      <option value="finalized" className="bg-card">Finalizada</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
