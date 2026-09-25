import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, FileText, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/pdf-batteries")({
  component: PdfBatteriesPage,
});

function PdfBatteriesPage() {
  const [totalInput, setTotalInput] = useState<string>("35");
  const totalQuestions = Math.min(500, Math.max(1, parseInt(totalInput, 10) || 1));
  const [divisions, setDivisions] = useState<number>(2);

  const generateDivisions = (count: number, max: number) => {
    const lists: number[][] = Array.from({ length: count }, () => []);
    for (let i = 1; i <= max; i++) {
      const idx = (i - 1) % count;
      lists[idx].push(i);
    }
    return lists;
  };

  const currentDivisions = generateDivisions(divisions, totalQuestions);

  const copyToClipboard = (nums: number[], title: string) => {
    navigator.clipboard.writeText(`${title}: ${nums.join(", ")}`);
    toast.success(`${title} copiado para a área de transferência!`);
  };

  return (
    <div className="app-page max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Layers className="w-8 h-8 text-primary" />
          Divisão Baterias PDF
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Divida baterias de questões de PDFs (ex: ímpares/pares ou até 5 divisões) para resolução espaçada.
        </p>
      </div>

      <Card className="p-6 card-elevated">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="totalQs" className="font-semibold">Total de Questões da Bateria (PDF)</Label>
              <Input
                id="totalQs"
                type="number"
                min={1}
                max={500}
                value={totalInput}
                onChange={(e) => setTotalInput(e.target.value)}
                onBlur={() => {
                  if (!totalInput || parseInt(totalInput, 10) < 1) setTotalInput("1");
                }}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="font-semibold">Quantidade de Divisões</Label>
              <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-2">
                {[2, 3, 4, 5].map((num) => (
                  <Button
                    key={num}
                    variant={divisions === num ? "default" : "outline"}
                    onClick={() => setDivisions(num)}
                    className="flex-1 h-auto min-h-[44px] p-2 px-3 flex items-center justify-center text-center whitespace-normal leading-tight"
                  >
                    {`${num} Divisões`}

                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-muted/40 p-4 rounded-xl space-y-2 border border-sidebar-border flex flex-col justify-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileText className="w-4 h-4" /> Resumo da Divisão
            </div>
            <div className="text-2xl font-bold">
              {totalQuestions} Questões em {divisions} Blocos
            </div>
            <p className="text-xs text-muted-foreground">
              Média de ~{Math.ceil(totalQuestions / divisions)} questões por bloco. Excelente para não cansar e revisar em etapas.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Blocos Gerados</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentDivisions.map((block, idx) => {
            const title = divisions === 2 
              ? (idx === 0 ? "Ímpares" : "Pares")
              : `Divisão ${idx + 1}`;
            return (
              <Card key={idx} className="p-5 card-elevated flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={idx % 2 === 0 ? "default" : "secondary"} className="text-sm font-semibold">
                      {title}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      {block.length} questões
                    </span>
                  </div>

                  <div className="bg-background/80 p-3 rounded-2xl border text-sm max-h-40 overflow-y-auto font-mono flex flex-wrap gap-1">
                    {block.map((num) => (
                      <span key={num} className="px-1.5 py-0.5 bg-muted rounded text-xs">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(block, title)}
                  className="mt-4 w-full flex items-center justify-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar Lista
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
