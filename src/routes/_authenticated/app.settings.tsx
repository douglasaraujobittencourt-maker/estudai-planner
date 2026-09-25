import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile, resetAllStudyData } from "@/lib/planner-api";
import { supabase } from "@/integrations/supabase/external-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const [form, setForm] = useState({ display_name: "", exam_name: "", exam_date: "", weekly_goal_hours: 14, weekly_goal_questions: 100, pages_per_hour: 10, minutes_per_question: 3 });
  const [isPreEdital, setIsPreEdital] = useState(false);

  useEffect(() => {
    if (profile) {
      const isPre = profile.exam_date === "Pré-edital" || profile.exam_date === "pre-edital" || !profile.exam_date;
      setIsPreEdital(isPre);
      setForm({
        display_name: profile.display_name ?? "",
        exam_name: profile.exam_name ?? "",
        exam_date: isPre ? "" : (profile.exam_date ?? ""),
        weekly_goal_hours: profile.weekly_goal_hours,
        weekly_goal_questions: profile.weekly_goal_questions,
        pages_per_hour: profile.pages_per_hour ?? 10,
        minutes_per_question: profile.minutes_per_question ?? 3,
      });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const examDateValue = isPreEdital ? "Pré-edital" : (form.exam_date || null);
      await updateProfile({
        display_name: form.display_name,
        exam_name: form.exam_name,
        exam_date: examDateValue,
        weekly_goal_hours: form.weekly_goal_hours,
        weekly_goal_questions: form.weekly_goal_questions,
      });
    },
    onSuccess: () => { toast.success("Configurações salvas."); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  const resetAll = useMutation({
    mutationFn: async () => {
      await resetAllStudyData();
    },
    onSuccess: () => {
      toast.success("Todos os dados de estudo foram zerados com sucesso! 🔄");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao zerar dados"),
  });

  return (
    <div className="px-4 py-4 pb-24 sm:p-6 md:pb-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Settings2 className="w-6 h-6" /> Configurações</h1>
      </div>
      <Card className="p-6 card-elevated space-y-4">
        <div><Label>Nome</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>Edital / Concurso</Label><Input value={form.exam_name} onChange={(e) => setForm({ ...form, exam_name: e.target.value })} /></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Data da prova</Label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setIsPreEdital(true)}
                  className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition ${
                    isPreEdital
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Pré-edital
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreEdital(false)}
                  className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition ${
                    !isPreEdital
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Data definida
                </button>
              </div>
            </div>
            {isPreEdital ? (
              <div className="p-2.5 rounded-md bg-primary/5 border border-primary/20 text-xs text-primary font-medium flex items-center gap-1.5 h-10">
                <span>📌 Status: <strong>Pré-edital</strong> (sem data marcada).</span>
              </div>
            ) : (
              <Input
                type="date"
                value={form.exam_date}
                onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
              />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Meta semanal (horas)</Label><Input type="number" value={form.weekly_goal_hours} onChange={(e) => setForm({ ...form, weekly_goal_hours: +e.target.value })} /></div>
          <div><Label>Páginas por hora</Label><Input type="number" value={form.pages_per_hour} onChange={(e) => setForm({ ...form, pages_per_hour: +e.target.value })} /></div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">Salvar</Button>
      </Card>

      <Card className="p-6 card-elevated border-destructive/30 space-y-4 bg-destructive/5">
        <div className="flex items-center gap-2 text-destructive font-bold text-lg">
          <AlertTriangle className="w-5 h-5" /> Zona de Perigo
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border border-destructive/30">
            <div>
              <h3 className="text-sm font-bold text-destructive">Zerar Todos os Dados de Estudo</h3>
              <p className="text-xs text-muted-foreground">
                Apaga todas as sessões registradas, revisões, páginas lidas das matérias e registros de horas.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("⚠️ ATENÇÃO: Tem certeza que deseja zerar TODOS os dados de estudo (sessões, revisões, páginas e XP)? Esta ação não pode ser desfeita.")) {
                  resetAll.mutate();
                }
              }}
              disabled={resetAll.isPending}
              className="text-xs shrink-0 font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Zerar Tudo
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
