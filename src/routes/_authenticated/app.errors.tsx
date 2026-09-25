import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getErrors, getSubjects, logError, updateError, deleteError } from "@/lib/planner-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Pencil, Trash2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/app/errors")({
  component: ErrorsPage,
});

type FormState = {
  subject_id: string; topic: string; banca: string; question: string;
  correct_answer: string; my_answer: string; reason: string;
  make_flashcard: boolean; front: string; back: string;
};

const emptyForm: FormState = {
  subject_id: "", topic: "", banca: "", question: "", correct_answer: "",
  my_answer: "", reason: "", make_flashcard: true, front: "", back: "",
};

function ErrorsPage() {
  const qc = useQueryClient();
  const { data: allSubjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: getSubjects });
  const subjects = allSubjects.filter((s: any) => s.study_status === "finalized");
  const { data: errors = [] } = useQuery({ queryKey: ["errors"], queryFn: getErrors });

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => { 
    setEditingId(null); 
    setForm({ ...emptyForm, subject_id: selectedSubjectId }); 
    setOpen(true); 
  };
  const openEdit = (e: any) => {
    setEditingId(e.id);
    setForm({
      subject_id: e.subject_id ?? "", topic: e.topic ?? "", banca: e.banca ?? "",
      question: e.question ?? "", correct_answer: e.correct_answer ?? "",
      my_answer: e.my_answer ?? "", reason: e.reason ?? "",
      make_flashcard: false, front: "", back: "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await updateError(editingId, {
          subject_id: form.subject_id || null,
          topic: form.topic || null, banca: form.banca || null,
          question: form.question, correct_answer: form.correct_answer || null,
          my_answer: form.my_answer || null, reason: form.reason || null,
        });
      } else {
        await logError({
          ...form, subject_id: form.subject_id || null,
          front: form.make_flashcard ? (form.front || form.question) : undefined,
          back: form.make_flashcard ? (form.back || form.correct_answer) : undefined,
        });
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Erro atualizado" : "Erro catalogado" + (form.make_flashcard ? " e virou flashcard 🃏" : ""));
      setOpen(false); setEditingId(null); setForm(emptyForm);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => deleteError(id),
    onSuccess: () => { toast.success("Erro excluído"); setDeletingId(null); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredErrors = errors.filter((e: any) => e.subject_id === selectedSubjectId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" /> Caderno de Erros</h1>
          <p className="text-muted-foreground text-sm">Cada erro vira aprendizado direcionado. Padrões por banca e tópico.</p>
        </div>
        {selectedSubjectId && (
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Registrar erro</Button>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4 bg-card rounded-lg border border-border/50 max-w-md">
        <Label className="text-sm font-medium">Selecione a Matéria</Label>
        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha uma matéria para ver os erros" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar erro" : "Novo erro"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Matéria</Label>
                <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                  <SelectContent>{subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Banca</Label><Input value={form.banca} onChange={(e) => setForm({ ...form, banca: e.target.value })} placeholder="Ex: CEBRASPE" /></div>
            </div>
            <div><Label>Tópico</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
            <div><Label>Enunciado / questão</Label><Textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sua resposta</Label><Input value={form.my_answer} onChange={(e) => setForm({ ...form, my_answer: e.target.value })} /></div>
              <div><Label>Resposta correta</Label><Input value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} /></div>
            </div>
            <div><Label>Motivo do erro</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Ex: confundi conceito X com Y" /></div>
            {!editingId && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.make_flashcard} onCheckedChange={(v) => setForm({ ...form, make_flashcard: !!v })} />
                Criar flashcard automaticamente
              </label>
            )}
            <Button onClick={() => save.mutate()} disabled={!form.question || save.isPending} className="w-full">
              {editingId ? "Salvar alterações" : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este erro?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && del.mutate(deletingId)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {subjects.length === 0 ? (
        <Card className="p-10 card-elevated text-center space-y-2">
          <Lock className="w-6 h-6 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Caderno de Erros bloqueado. Marque uma matéria como <strong>Finalizada</strong> no Ciclo (Modo revisão) para liberar.</p>
        </Card>
      ) : !selectedSubjectId ? (
        <Card className="p-10 card-elevated text-center">
          <p className="text-muted-foreground">Selecione uma matéria acima para visualizar o caderno de erros.</p>
        </Card>
      ) : filteredErrors.length === 0 ? (
        <Card className="p-10 card-elevated text-center">
          <p className="text-muted-foreground">Nenhum erro registrado para esta matéria. Cada erro catalogado é um acerto na prova!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredErrors.map((e: any) => (
            <Card key={e.id} className="p-4 card-elevated">
              <div className="flex items-start gap-3">
                <span className="w-2 h-2 mt-2 rounded-full" style={{ background: e.subject?.color ?? "#888" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs mb-1">
                    <Badge variant="outline">{e.subject?.name ?? "Sem matéria"}</Badge>
                    {e.banca && <Badge variant="secondary">{e.banca}</Badge>}
                    {e.topic && <span className="text-muted-foreground">· {e.topic}</span>}
                  </div>
                  <p className="text-sm">{e.question}</p>
                  <div className="mt-1 text-xs text-muted-foreground">Você: <span className="text-destructive">{e.my_answer || "—"}</span> · Correta: <span className="text-success">{e.correct_answer || "—"}</span></div>
                  {e.reason && <div className="mt-1 text-xs">💡 {e.reason}</div>}
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(e)} aria-label="Editar"><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeletingId(e.id)} aria-label="Excluir"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
