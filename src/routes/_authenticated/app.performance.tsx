import { localDateStr, addDaysStr } from "@/lib/dates";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSubjects, getSessionsBetween, getAllSessions } from "@/lib/planner-api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Clock, CheckCircle2, Target, BarChart2, BookOpen, Layers } from "lucide-react";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/performance")({
  component: PerformancePage,
});

function PerformancePage() {
  const today = localDateStr();
  const from = addDaysStr(-29);
  const now = new Date();
  const currentYear = now.getFullYear();

  // Time filter: "all" (Todo o período) | "30d" (Últimos 30 dias)
  const [timeRange, setTimeRange] = useState<"all" | "30d">("all");

  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: getSubjects });
  const { data: sessions30d = [] } = useQuery({ queryKey: ["perf", from, today], queryFn: () => getSessionsBetween(from, today) });
  const { data: allSessions = [] } = useQuery({ queryKey: ["all-sessions"], queryFn: getAllSessions });

  const activeSessions = timeRange === "30d" ? sessions30d : allSessions;

  // Hours per day (last 14 days)
  const dailyMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = addDaysStr(-i);
    dailyMap.set(d, 0);
  }
  sessions30d.forEach((s: any) => {
    if (dailyMap.has(s.session_date)) dailyMap.set(s.session_date, (dailyMap.get(s.session_date)! + (s.minutes || 0) / 60));
  });
  const dailyData = Array.from(dailyMap.entries()).map(([d, h]) => ({ day: d.slice(5), horas: +h.toFixed(1) }));

  // Individualized metrics per subject
  const subjectStats = subjects.map((s) => {
    const subSessions = activeSessions.filter((x: any) => x.subject_id === s.id || x.subject?.id === s.id);
    const minutes = subSessions.reduce((acc: number, x: any) => acc + (x.minutes || 0), 0);
    const hours = +(minutes / 60).toFixed(1);
    const qDone = subSessions.reduce((acc: number, x: any) => acc + (x.questions_done || 0), 0);
    const qCorrect = subSessions.reduce((acc: number, x: any) => acc + (x.questions_correct || 0), 0);
    const accuracy = qDone > 0 ? Math.round((qCorrect / qDone) * 100) : 0;

    return {
      ...s,
      hours,
      qDone,
      qCorrect,
      accuracy,
      sessionsCount: subSessions.length,
    };
  });

  // Totais gerais com base no filtro
  const totalHours = +subjectStats.reduce((a, s) => a + s.hours, 0).toFixed(1);
  const totalQ = subjectStats.reduce((a, s) => a + s.qDone, 0);
  const totalC = subjectStats.reduce((a, s) => a + s.qCorrect, 0);
  const overallAccuracy = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

  // Radar per subject accuracy
  const radar = subjects.map((s) => {
    const stat = subjectStats.find((item) => item.id === s.id);
    return {
      subject: s.name.split(" ").slice(0, 2).join(" "),
      acerto: stat?.accuracy || 0,
      fullSubject: s.name,
    };
  });

  // Horas acumuladas por ano (2026+)
  const yearlyHours: Record<number, number> = {};
  for (let yr = 2026; yr <= 2032; yr++) {
    yearlyHours[yr] = 0;
  }
  allSessions.forEach((s: any) => {
    if (s.session_date) {
      const yr = new Date(s.session_date).getFullYear();
      if (yearlyHours[yr] !== undefined) {
        yearlyHours[yr] += (s.minutes ?? 0) / 60;
      }
    }
  });
  const totalAllTimeHours = Object.values(yearlyHours).reduce((a, b) => a + b, 0);

  return (
    <div className="app-page max-w-6xl space-y-6">
      {/* Header com seletor de período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-primary" /> Desempenho
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Métricas completas e individualizadas por matéria: horas estudadas, questões feitas e taxa de acerto.
          </p>
        </div>

        {/* Toggle de Período */}
        <div className="inline-flex p-1 rounded-xl bg-muted border border-border/60 shrink-0">
          <button
            onClick={() => setTimeRange("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeRange === "all"
                ? "bg-card text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Todo o Histórico
          </button>
          <button
            onClick={() => setTimeRange("30d")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeRange === "30d"
                ? "bg-card text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Últimos 30 dias
          </button>
        </div>
      </div>

      {/* Cards de Resumo Geral */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 card-elevated border-l-4 border-l-primary flex flex-col justify-between">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" /> Horas Estudadas
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{totalHours}h</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {timeRange === "all" ? "Tempo total acumulado" : "Nos últimos 30 dias"}
            </p>
          </div>
        </Card>

        <Card className="p-4 card-elevated border-l-4 border-l-sky-500 flex flex-col justify-between">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Target className="w-4 h-4 text-sky-500" /> Questões Feitas
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{totalQ}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Exercícios resolvidos
            </p>
          </div>
        </Card>

        <Card className="p-4 card-elevated border-l-4 border-l-primary flex flex-col justify-between">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-primary" /> Questões Corretas
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">{totalC}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Acertos confirmados
            </p>
          </div>
        </Card>

        <Card className="p-4 card-elevated border-l-4 border-l-violet-500 flex flex-col justify-between">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-violet-500" /> Taxa de Acerto Geral
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-violet-600 dark:text-violet-400">{overallAccuracy}%</div>
            <Progress value={overallAccuracy} className="h-1.5 mt-1.5" />
          </div>
        </Card>
      </div>

      {/* SEÇÃO PRINCIPAL: DESEMPENHO INDIVIDUALIZADO POR MATÉRIA */}
      <Card className="p-6 card-elevated space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Desempenho Individual por Matéria
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Horas estudadas, questões feitas, acertos e taxa de aproveitamento por disciplina ({timeRange === "all" ? "Histórico Completo" : "Últimos 30 dias"}).
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {subjects.length} matérias cadastradas
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground font-semibold text-xs">
                <th className="py-3 px-3">Matéria</th>
                <th className="py-3 px-3 text-right">Horas Estudadas</th>
                <th className="py-3 px-3 text-right">Questões Feitas</th>
                <th className="py-3 px-3 text-right">Acertos</th>
                <th className="py-3 px-3 text-right">Taxa de Acerto (%)</th>
                <th className="py-3 px-3 text-center">Status / Modo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subjectStats.map((row) => {
                // Color formatting for accuracy
                let accColor = "text-muted-foreground";
                let badgeVariant = "outline";
                if (row.qDone > 0) {
                  if (row.accuracy >= 80) accColor = "text-primary font-bold";
                  else if (row.accuracy >= 65) accColor = "text-amber-600 dark:text-amber-400 font-bold";
                  else accColor = "text-destructive font-bold";
                }

                return (
                  <tr key={row.id} className="hover:bg-muted/30 transition">
                    {/* Nome da Matéria */}
                    <td className="py-3 px-3 font-semibold">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 aspect-square"
                          style={{ background: row.color || "#0284C7" }}
                        />
                        <span className="truncate">{row.name}</span>
                      </div>
                    </td>

                    {/* Horas Estudadas */}
                    <td className="py-3 px-3 text-right font-medium">
                      <span className="font-semibold text-foreground">{row.hours}h</span>
                      {row.sessionsCount > 0 && (
                        <span className="text-[11px] text-muted-foreground block">
                          {row.sessionsCount} {row.sessionsCount === 1 ? "sessão" : "sessões"}
                        </span>
                      )}
                    </td>

                    {/* Questões Feitas */}
                    <td className="py-3 px-3 text-right font-medium text-foreground">
                      {row.qDone > 0 ? row.qDone : "—"}
                    </td>

                    {/* Questões Corretas */}
                    <td className="py-3 px-3 text-right font-medium text-primary">
                      {row.qDone > 0 ? row.qCorrect : "—"}
                    </td>

                    {/* Taxa de Acerto */}
                    <td className="py-3 px-3 text-right">
                      {row.qDone > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className={accColor}>{row.accuracy}%</span>
                          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${
                                row.accuracy >= 80
                                  ? "bg-primary"
                                  : row.accuracy >= 65
                                  ? "bg-amber-500"
                                  : "bg-destructive"
                              }`}
                              style={{ width: `${row.accuracy}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sem questões</span>
                      )}
                    </td>

                    {/* Status / Modo */}
                    <td className="py-3 px-3 text-center">
                      {row.study_status === "finalized" ? (
                        <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary font-bold">
                          🎓 Modo Revisão
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-sky-600 dark:text-sky-400 border-sky-500/30">
                          📘 Modo Teoria
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Linha de Total */}
              <tr className="bg-muted/60 font-bold border-t text-sm">
                <td className="py-3 px-3">TOTAL GERAL</td>
                <td className="py-3 px-3 text-right text-primary">{totalHours}h</td>
                <td className="py-3 px-3 text-right text-foreground">{totalQ}</td>
                <td className="py-3 px-3 text-right text-primary">{totalC}</td>
                <td className="py-3 px-3 text-right text-violet-600 dark:text-violet-400">{overallAccuracy}%</td>
                <td className="py-3 px-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Gráficos Comparativos */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Gráfico 1: Horas por dia (últimos 14 dias) */}
        <Card className="p-5 card-elevated space-y-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            Horas por Dia (Últimos 14 dias)
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip
                  formatter={(val: any) => [`${val}h`, "Horas Estudadas"]}
                  contentStyle={{ borderRadius: 8 }}
                />
                <Bar dataKey="horas" fill="#0284C7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Gráfico 2: Radar de Acerto por Matéria */}
        <Card className="p-5 card-elevated space-y-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Aproveitamento por Matéria (% de Acerto)
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid stroke="oklch(1 0 0 / 10%)" />
                <PolarAngleAxis dataKey="subject" fontSize={10} />
                <PolarRadiusAxis domain={[0, 100]} fontSize={9} />
                <Radar
                  dataKey="acerto"
                  name="Taxa de Acerto (%)"
                  stroke="#7C3AED"
                  fill="#7C3AED"
                  fillOpacity={0.35}
                />
                <Tooltip formatter={(v: any) => [`${v}%`, "Acerto"]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Horas Acumuladas por Ano */}
      <Card className="p-5 card-elevated space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Horas Acumuladas por Ano (2026+)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground font-semibold text-xs">
                <th className="py-2.5 px-3">Ano</th>
                <th className="py-2.5 px-3 text-right">Horas Acumuladas (h)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(yearlyHours).map(([yr, h]) => (
                <tr
                  key={yr}
                  className={`hover:bg-muted/30 transition ${
                    +yr === currentYear ? "font-bold bg-primary/5" : ""
                  }`}
                >
                  <td className="py-2 px-3 flex items-center gap-2">
                    {yr} {+yr === currentYear && <Badge variant="secondary" className="text-[10px]">Ano Atual</Badge>}
                  </td>
                  <td className="py-2 px-3 text-right font-medium">{h.toFixed(1)}h</td>
                </tr>
              ))}
              <tr className="bg-muted/60 font-bold border-t">
                <td className="py-3 px-3">TOTAL GERAL HISTÓRICO</td>
                <td className="py-3 px-3 text-right text-primary">{totalAllTimeHours.toFixed(1)}h</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

