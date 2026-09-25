import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpenCheck, AlertTriangle } from "lucide-react";
import { EDITAL_BLOCKS, EDITAL_HEADER } from "@/lib/edital-data";

export const Route = createFileRoute("/_authenticated/app/edital")({
  component: EditalPage,
});

type Marks = Record<string, { estudei?: boolean; questao?: boolean; revisei?: boolean }>;
const STORAGE_KEY = "planner-edital-marks-v1";

function useMarks() {
  const [marks, setMarks] = useState<Marks>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMarks(JSON.parse(raw));
    } catch {}
  }, []);
  const update = (id: string, field: "estudei" | "questao" | "revisei", value: boolean) => {
    setMarks((prev) => {
      const next = { ...prev, [id]: { ...prev[id], [field]: value } };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return { marks, update };
}

function EditalPage() {
  const { marks, update } = useMarks();

  const totals = useMemo(() => {
    let total = 0, estudei = 0, questao = 0, revisei = 0;
    for (const b of EDITAL_BLOCKS) {
      for (const t of b.topics) {
        total++;
        if (marks[t.id]?.estudei) estudei++;
        if (marks[t.id]?.questao) questao++;
        if (marks[t.id]?.revisei) revisei++;
      }
    }
    return { total, estudei, questao, revisei };
  }, [marks]);

  const pct = (n: number) => (totals.total ? Math.round((n / totals.total) * 100) : 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpenCheck className="w-6 h-6 text-primary" /> Edital Verticalizado
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{EDITAL_HEADER}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Já estudei", n: totals.estudei, color: "bg-primary" },
          { label: "Já fiz questão", n: totals.questao, color: "bg-accent" },
          { label: "Revisei", n: totals.revisei, color: "bg-success" },
        ].map((s) => (
          <Card key={s.label} className="p-4 card-elevated">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.n}<span className="text-xs text-muted-foreground ml-1">/ {totals.total} · {pct(s.n)}%</span></div>
            <Progress value={pct(s.n)} className="mt-2 h-1.5" />
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        {EDITAL_BLOCKS.map((block) => {
          const bTotal = block.topics.length;
          const bDone = block.topics.filter((t) => marks[t.id]?.estudei).length;
          return (
            <Card key={block.id} className="p-5 card-elevated">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <h2 className="font-semibold">{block.title}</h2>
                <Badge variant="outline">{bDone}/{bTotal} estudados</Badge>
              </div>

              <div className="hidden md:grid grid-cols-[1fr_90px_90px_90px] text-xs text-muted-foreground pb-2 border-b border-border/60">
                <div>Assunto</div>
                <div className="text-center">Estudei</div>
                <div className="text-center">Fiz questão</div>
                <div className="text-center">Revisei</div>
              </div>

              <ul className="divide-y divide-border/40">
                {block.topics.map((t) => {
                  const m = marks[t.id] ?? {};
                  return (
                    <li key={t.id} className="grid grid-cols-[1fr_60px_60px_60px] md:grid-cols-[1fr_90px_90px_90px] gap-2 py-2 items-start text-sm">
                      <div className="pr-2">
                        {t.text}
                        {t.warn && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-warning">
                            <AlertTriangle className="w-3 h-3" /> {t.warn}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-center pt-0.5"><Checkbox checked={!!m.estudei} onCheckedChange={(v) => update(t.id, "estudei", !!v)} /></div>
                      <div className="flex justify-center pt-0.5"><Checkbox checked={!!m.questao} onCheckedChange={(v) => update(t.id, "questao", !!v)} /></div>
                      <div className="flex justify-center pt-0.5"><Checkbox checked={!!m.revisei} onCheckedChange={(v) => update(t.id, "revisei", !!v)} /></div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
