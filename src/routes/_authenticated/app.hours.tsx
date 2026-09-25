import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSubjects, getAllSessions, logSession, updateSession, deleteSession } from "@/lib/planner-api";
import { localDateStr } from "@/lib/dates";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/hours")({
  head: () => ({
    meta: [
      { title: "Registro de horas — O Plano" },
      { name: "description", content: "Lance data, matéria, tarefa, aula, páginas e tempo de cada sessão de estudo." },
      { property: "og:title", content: "Registro de horas — O Plano" },
      { property: "og:description", content: "Lance data, matéria, tarefa, aula, páginas e tempo de cada sessão de estudo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HoursPage,
});

const TASKS = ["Leitura de PDF", "Videoaula", "Questões", "Revisão", "Resumo", "Simulado", "Redação", "Lei seca"] as const;

const KIND_BY_TASK: Record<string, "leitura" | "questoes" | "revisao" | "redacao" | "flashcards"> = {
  "Leitura de PDF": "leitura",
  "Videoaula": "leitura",
  "Resumo": "leitura",
  "Lei seca": "leitura",
  "Questões": "questoes",
  "Simulado": "questoes",
  "Revisão": "revisao",
  "Redação": "redacao",
};

type Row = {
  id: string; session_date: string; subject_id: string | null; task: string | null; lesson: string | null;
  page_start: number | null; page_end: number | null; minutes: number; notes: string | null; pages_read: number;
  kind: string; subject?: { name: string; color: string } | null;
};

function hoursLabel(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function pagesPerHour(pages: number, minutes: number) {
  if (!minutes || !pages) return "—";
  return (pages / (minutes / 60)).toFixed(1);
}

function HoursPage() {
  const qc = useQueryClient();
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: getSubjects });
  const { data: sessions = [] } = useQuery({ queryKey: ["all-sessions"], queryFn: getAllSessions });

  const [open, setOpen] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const empty = {
    session_date: localDateStr(), subject_id: "", task: "Leitura de PDF", lesson: "",
    page_start: "", page_end: "", hours: "0", minutes: "30", notes: "",
  };
  const [form, setForm] = useState({ ...empty });
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const rows: Row[] = useMemo(() => {
    const list = (sessions as any[]).slice().sort((a, b) =>
      String(b.session_date).localeCompare(String(a.session_date)) ||
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );
    return filterSubject === "all" ? list : list.filter((s) => s.subject_id === filterSubject);
  }, [sessions, filterSubject]);

  const totalMinutes = rows.reduce((a, r) => a + (r.minutes ?? 0), 0);
  const totalPages = rows.reduce((a, r) => a + (r.pages_read ?? 0), 0);

  const parseMinutes = (h: string, m: string) => Math.max(1, (Number(h) || 0) * 60 + (Number(m) || 0));
  const derivedPages = (start: string | number | null, end: string | number | null) => {
    const s = Number(start), e = Number(end);
    if (!s || !e || e < s) return 0;
    return e - s + 1;
  };

  const create = useMutation({
    mutationFn: async () => {
      const minutes = parseMinutes(form.hours, form.minutes);
      await logSession({
        subject_id: form.subject_id || null,
        kind: KIND_BY_TASK[form.task] ?? "leitura",
        minutes,
        pages_read: derivedPages(form.page_start, form.page_end),
        notes: form.notes,
        task: form.task,
        lesson: form.lesson || null,
        page_start: form.page_start ? Number(form.page_start) : null,
        page_end: form.page_end ? Number(form.page_end) : null,
        session_date: form.session_date,
      });
    },
    onSuccess: () => { toast.success("Registro salvo"); setOpen(false); setForm({ ...empty }); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await updateSession(editing.id, {
        subject_id: editing.subject_id || null,
        task: editing.task,
        lesson: editing.lesson,
        page_start: editing.page_start,
        page_end: editing.page_end,
        pages_read: derivedPages(editing.page_start, editing.page_end) || editing.pages_read,
        minutes: Math.max(1, editing.minutes),
        notes: editing.notes,
        session_date: editing.session_date,
      });
    },
    onSuccess: () => { toast.success("Registro atualizado"); setEditing(null); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => { toast.success("Registro excluído"); setDeleteId(null); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="px-4 py-4 pb-24 sm:p-6 md:pb-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">2 · Registro de horas</h1>
          <p className="text-muted-foreground text-sm">Cada linha é uma sessão: data, matéria, tarefa, aula, páginas e tempo.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Novo registro</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 card-elevated">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Registros</div>
          <div className="text-2xl font-bold">{rows.length}</div>
        </Card>
        <Card className="p-4 card-elevated">
          <div className="text-xs text-muted-foreground">Horas totais</div>
          <div className="text-2xl font-bold">{(totalMinutes / 60).toFixed(1)}h</div>
        </Card>
        <Card className="p-4 card-elevated">
          <div className="text-xs text-muted-foreground">Páginas lidas</div>
          <div className="text-2xl font-bold">{totalPages}</div>
        </Card>
        <Card className="p-4 card-elevated">
          <div className="text-xs text-muted-foreground">Páginas / hora</div>
          <div className="text-2xl font-bold">{pagesPerHour(totalPages, totalMinutes)}</div>
        </Card>
      </div>

      <Card className="p-4 card-elevated">
        <div className="flex items-center gap-2 mb-3">
          <Label className="text-xs text-muted-foreground">Filtrar por matéria</Label>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-64 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as matérias</SelectItem>
              {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 pr-3">Data</th>
                <th className="py-2 pr-3">Matéria</th>
                <th className="py-2 pr-3">Tarefa</th>
                <th className="py-2 pr-3">Aula</th>
                <th className="py-2 pr-3 text-right">Pág. inicial</th>
                <th className="py-2 pr-3 text-right">Pág. final</th>
                <th className="py-2 pr-3 text-right">Tempo</th>
                <th className="py-2 pr-3">Comentário</th>
                <th className="py-2 pr-3 text-right">Págs. lidas</th>
                <th className="py-2 pr-3 text-right">Págs/h</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={11} className="py-6 text-center text-muted-foreground">Nenhum registro ainda.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/40">
                  <td className="py-2 pr-3 whitespace-nowrap">{r.session_date.split("-").reverse().join("/")}</td>
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.subject?.color ?? "#94a3b8" }} />
                      <span className="truncate max-w-[180px] inline-block align-middle">{r.subject?.name ?? "—"}</span>
                    </span>
                  </td>
                  <td className="py-2 pr-3">{r.task ?? "—"}</td>
                  <td className="py-2 pr-3 truncate max-w-[140px]">{r.lesson ?? "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.page_start ?? "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.page_end ?? "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{hoursLabel(r.minutes ?? 0)}</td>
                  <td className="py-2 pr-3 truncate max-w-[200px] text-muted-foreground">{r.notes ?? "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.pages_read ?? 0}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{pagesPerHour(r.pages_read ?? 0, r.minutes ?? 0)}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => setEditing({ ...r })}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Novo registro de horas</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Data</Label><Input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} /></div>
            <div>
              <Label>Matéria</Label>
              <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tarefa</Label>
              <Select value={form.task} onValueChange={(v) => setForm({ ...form, task: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Aula</Label><Input value={form.lesson} onChange={(e) => setForm({ ...form, lesson: e.target.value })} placeholder="Ex: Aula 02" /></div>
            <div><Label>Página inicial</Label><Input type="number" min={0} value={form.page_start} onChange={(e) => setForm({ ...form, page_start: e.target.value })} /></div>
            <div><Label>Página final</Label><Input type="number" min={0} value={form.page_end} onChange={(e) => setForm({ ...form, page_end: e.target.value })} /></div>
            <div><Label>Horas</Label><Input type="number" min={0} value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></div>
            <div><Label>Minutos</Label><Input type="number" min={0} max={59} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Comentário</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Páginas lidas calculadas: <strong>{derivedPages(form.page_start, form.page_end)}</strong></p>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar registro</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar registro</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={editing.session_date} onChange={(e) => setEditing({ ...editing, session_date: e.target.value })} /></div>
              <div>
                <Label>Matéria</Label>
                <Select value={editing.subject_id ?? ""} onValueChange={(v) => setEditing({ ...editing, subject_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                  <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tarefa</Label>
                <Select value={editing.task ?? "Leitura de PDF"} onValueChange={(v) => setEditing({ ...editing, task: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TASKS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Aula</Label><Input value={editing.lesson ?? ""} onChange={(e) => setEditing({ ...editing, lesson: e.target.value })} /></div>
              <div><Label>Página inicial</Label><Input type="number" value={editing.page_start ?? ""} onChange={(e) => setEditing({ ...editing, page_start: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Página final</Label><Input type="number" value={editing.page_end ?? ""} onChange={(e) => setEditing({ ...editing, page_end: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Tempo (minutos)</Label><Input type="number" min={1} value={editing.minutes} onChange={(e) => setEditing({ ...editing, minutes: Number(e.target.value) })} /></div>
              <div className="md:col-span-2"><Label>Comentário</Label><Input value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <Button className="md:col-span-2" onClick={() => update.mutate()} disabled={update.isPending}>Salvar alterações</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
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
