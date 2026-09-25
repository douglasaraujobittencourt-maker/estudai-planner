import { localDateStr } from "@/lib/dates";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDueFlashcards, reviewFlashcard, getAllFlashcards, getSubjects,
  createFlashcard, updateFlashcard, deleteFlashcard,
} from "@/lib/planner-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Check, X, RotateCw, Plus, Pencil, Trash2, BookOpen, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/app/flashcards")({
  component: FlashcardsPage,
});

type FormState = { front: string; back: string; subject_id: string };
const emptyForm: FormState = { front: "", back: "", subject_id: "" };

function FlashcardsPage() {
  const qc = useQueryClient();
  const today = localDateStr();
  const { data: cards = [] } = useQuery({ queryKey: ["cards-due", today], queryFn: () => getDueFlashcards(today) });
  const { data: allCards = [] } = useQuery({ queryKey: ["cards-all"], queryFn: getAllFlashcards });
  const { data: allSubjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: getSubjects });
  const subjects = useMemo(
    () => allSubjects.filter((s: any) => s.study_status === "finalized"),
    [allSubjects],
  );

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const filteredCards = useMemo(() => {
    return cards.filter((c: any) => c.subject_id === selectedSubjectId);
  }, [cards, selectedSubjectId]);

  const card = filteredCards[idx];

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const review = useMutation({
    mutationFn: ({ correct }: { correct: boolean }) => reviewFlashcard(card.id, correct, card.box),
    onSuccess: () => {
      setFlipped(false);
      if (idx + 1 >= filteredCards.length) { toast.success("Sessão de flashcards concluída! 🎉"); qc.invalidateQueries(); setIdx(0); }
      else setIdx(idx + 1);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.front.trim() || !form.back.trim()) throw new Error("Preencha frente e verso");
      if (editingId) {
        await updateFlashcard(editingId, { front: form.front, back: form.back, subject_id: form.subject_id || null });
      } else {
        await createFlashcard({ front: form.front, block: undefined, back: form.back, subject_id: form.subject_id || null } as any);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Flashcard atualizado" : "Flashcard criado");
      setOpen(false); setEditingId(null); setForm(emptyForm);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFlashcard(id),
    onSuccess: () => { toast.success("Flashcard excluído"); setDeleteId(null); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => { 
    setEditingId(null); 
    setForm({ ...emptyForm, subject_id: selectedSubjectId }); 
    setOpen(true); 
  };
  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({ front: c.front, back: c.back, subject_id: c.subject_id ?? "" });
    setOpen(true);
  };

  const groupedCards = useMemo(() => {
    const map = new Map<string, { subject: any; cards: any[] }>();
    const filteredAll = allCards.filter((c: any) => c.subject_id === selectedSubjectId);
    for (const c of filteredAll) {
      const key = c.subject_id ?? "__none__";
      if (!map.has(key)) map.set(key, { subject: c.subject, cards: [] });
      map.get(key)!.cards.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const nameA = a[1].subject?.name ?? "";
      const nameB = b[1].subject?.name ?? "";
      return nameA.localeCompare(nameB);
    });
  }, [allCards, selectedSubjectId]);

  return (
    <div className="px-4 py-4 pb-24 sm:p-6 md:pb-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-accent" /> Flashcards</h1>
          <p className="text-muted-foreground text-sm">Sistema Leitner: cards acertados vão para caixas mais espaçadas.</p>
        </div>
        {selectedSubjectId && (
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4 bg-card rounded-lg border border-border/50 max-w-md">
        <Label className="text-sm font-medium">Selecione a Matéria</Label>
        <Select value={selectedSubjectId} onValueChange={(v) => { setSelectedSubjectId(v); setIdx(0); setFlipped(false); }}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha uma matéria para ver os flashcards" />
          </SelectTrigger>
          <SelectContent>
            {subjects.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma matéria finalizada ainda</div>
            ) : subjects.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {subjects.length === 0 ? (
        <Card className="p-10 card-elevated text-center space-y-2">
          <Lock className="w-6 h-6 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Flashcards bloqueados. Marque uma matéria como <strong>Finalizada</strong> no Ciclo (Modo revisão) para liberar.</p>
        </Card>
      ) : !selectedSubjectId ? (
        <Card className="p-10 card-elevated text-center">
          <p className="text-muted-foreground">Selecione uma matéria acima para visualizar os flashcards.</p>
        </Card>
      ) : (
        <>
          {!card ? (
            <Card className="p-10 card-elevated text-center">
              <p className="text-muted-foreground">Nada devido hoje para esta matéria. Crie cards a partir dos seus erros no caderno.</p>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{idx + 1} / {filteredCards.length}</span>
                <Badge variant="outline">Caixa {card.box}</Badge>
                <span className="w-2 h-2 rounded-full" style={{ background: card.subject?.color ?? "#666" }} />
              </div>
              <Card
                onClick={() => setFlipped((f) => !f)}
                className="p-10 card-elevated min-h-64 flex items-center justify-center cursor-pointer text-center hover:border-primary/40 transition-colors"
              >
                <div>
                  <div className="text-xs uppercase text-muted-foreground tracking-wider mb-3">{flipped ? "Resposta" : "Pergunta"}</div>
                  <p className="text-xl font-medium">{flipped ? card.back : card.front}</p>
                  {!flipped && <p className="text-xs text-muted-foreground mt-6">Toque para virar</p>}
                </div>
              </Card>

              {flipped ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => review.mutate({ correct: false })} variant="outline" size="lg" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                    <X className="w-4 h-4 mr-1" /> Errei
                  </Button>
                  <Button onClick={() => review.mutate({ correct: true })} size="lg">
                    <Check className="w-4 h-4 mr-1" /> Acertei
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setFlipped(true)} variant="outline" size="lg" className="w-full">
                  <RotateCw className="w-4 h-4 mr-1" /> Ver resposta
                </Button>
              )}
            </>
          )}

          <Card className="p-5 card-elevated">
            <h2 className="font-semibold mb-3">Cards desta matéria ({groupedCards.length > 0 ? groupedCards[0][1].cards.length : 0})</h2>
            {groupedCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum flashcard criado ainda para esta matéria.</p>
            ) : (
              <div className="space-y-4">
                {groupedCards.map(([key, group]) => (
                  <div key={key} className="rounded-lg border border-border/50 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="w-2 h-2 rounded-full" style={{ background: group.subject?.color ?? "#666" }} />
                      <span className="font-medium text-sm">{group.subject?.name ?? "Sem matéria"}</span>
                      <Badge variant="outline" className="ml-auto text-[10px]">{group.cards.length}</Badge>
                    </div>
                    <ul className="divide-y divide-border/50">
                      {group.cards.map((c: any) => (
                        <li key={c.id} className="flex items-center gap-3 text-sm p-3">
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium">{c.front}</div>
                            <div className="truncate text-xs text-muted-foreground">{c.back}</div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">Caixa {c.box}</Badge>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteId(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar flashcard" : "Novo flashcard"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Matéria</Label>
              <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar (opcional)" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Frente (pergunta)</Label><Textarea value={form.front} onChange={(e) => setForm({ ...form, front: e.target.value })} /></div>
            <div><Label>Verso (resposta)</Label><Textarea value={form.back} onChange={(e) => setForm({ ...form, back: e.target.value })} /></div>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
              {editingId ? "Salvar alterações" : "Criar flashcard"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir flashcard?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && del.mutate(deleteId)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
