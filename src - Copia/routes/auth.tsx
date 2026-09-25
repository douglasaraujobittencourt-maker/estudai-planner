import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/app" });
    });
  }, [nav]);

  const handleGoogle = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Falha ao entrar com Google");
    else if (!r.redirected) nav({ to: "/app" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name }, emailRedirectTo: window.location.origin + "/app" },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode entrar.");
        setMode("in");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/app" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro na autenticação");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2.5 justify-center mb-8">
          <img src="/favicon.svg" alt="Logo" className="w-10 h-10 rounded-xl shadow-sm shrink-0 object-contain" />
          <span className="font-display font-bold text-xl">EstudAI</span>
        </Link>
        <Card className="p-6 card-elevated">
          <h1 className="text-2xl font-bold mb-1">{mode === "in" ? "Entrar" : "Criar conta"}</h1>
          <p className="text-sm text-muted-foreground mb-5">
            {mode === "in" ? "Continue seu ciclo de estudos." : "SEDES/DF já configurada. Em 30 segundos você começa."}
          </p>

          <Button onClick={handleGoogle} variant="outline" className="w-full mb-4">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continuar com Google
          </Button>

          <div className="relative my-4 text-center text-xs text-muted-foreground">
            <span className="bg-card px-2 relative z-10">ou</span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "up" && (
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : mode === "in" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-muted-foreground hover:text-foreground mt-4">
            {mode === "in" ? "Ainda não tenho conta" : "Já tenho conta"}
          </button>
        </Card>
      </div>
    </div>
  );
}
