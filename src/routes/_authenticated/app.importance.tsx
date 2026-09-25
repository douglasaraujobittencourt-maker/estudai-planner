import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Star } from "lucide-react";
import { IMPORTANCE_GROUPS, weightLabel } from "@/lib/edital-data";

export const Route = createFileRoute("/_authenticated/app/importance")({
  component: ImportancePage,
});

function WeightStars({ w }: { w: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Grau ${w} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= w ? "fill-accent text-accent" : "text-muted-foreground/40"}`} />
      ))}
    </div>
  );
}

function weightBadge(w: number) {
  const map: Record<number, string> = {
    5: "bg-destructive/15 text-destructive border-destructive/30",
    4: "bg-warning/15 text-warning border-warning/30",
    3: "bg-primary/15 text-primary-foreground border-primary/30",
    2: "bg-muted text-muted-foreground border-border",
    1: "bg-muted text-muted-foreground border-border",
  };
  return map[w] ?? map[2];
}

function ImportancePage() {
  return (
    <div className="px-4 py-4 pb-24 sm:p-6 md:pb-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Flame className="w-6 h-6 text-accent" /> Grau de Importância
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Disciplinas por área ordenadas pelo peso na prova · INSS
        </p>
      </div>

      <div className="space-y-5">
        {IMPORTANCE_GROUPS.map((g) => (
          <Card key={g.id} className="p-5 card-elevated">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
              <h2 className="font-semibold">{g.title}</h2>
            </div>

            <div className="hidden md:grid grid-cols-[40px_1fr_150px_110px_160px] text-xs text-muted-foreground pb-2 border-b border-border/60">
              <div>Nº</div>
              <div>Disciplina</div>
              <div>Questões</div>
              <div>Pontos</div>
              <div>Grau de importância</div>
            </div>

            <ul className="divide-y divide-border/40">
              {g.rows.map((r, i) => (
                <li key={i} className="grid grid-cols-[40px_1fr] md:grid-cols-[40px_1fr_150px_110px_160px] gap-2 py-3 items-center text-sm">
                  <div className="text-muted-foreground">{i + 1}</div>
                  <div>
                    <div className="font-medium">{r.discipline}</div>
                    <div className="md:hidden text-xs text-muted-foreground mt-0.5">{r.questions} · {r.points}</div>
                  </div>
                  <div className="hidden md:block text-muted-foreground">{r.questions}</div>
                  <div className="hidden md:block text-muted-foreground">{r.points}</div>
                  <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                    <WeightStars w={r.weight} />
                    <Badge variant="outline" className={weightBadge(r.weight)}>{weightLabel(r.weight)}</Badge>
                  </div>
                </li>
              ))}
            </ul>

            {g.note && <p className="text-[11px] text-muted-foreground mt-3">{g.note}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
