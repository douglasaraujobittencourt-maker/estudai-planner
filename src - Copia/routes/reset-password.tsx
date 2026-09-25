import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/external-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import oPlanoLogo from "@/assets/o-plano-cup.png.asset.json";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Redefinir Senha — O Plano" },
      { name: "description", content: "Defina uma nova senha para acessar o seu planner de estudos." },
      { property: "og:title", content: "Redefinir Senha — O Plano" },
      { property: "og:description", content: "Defina uma nova senha para acessar o seu planner de estudos." },
    ],
  }),
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // O Supabase processa automaticamente o token de recuperação na URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso!");
      nav({ to: "/app" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao atualizar a senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <Link to="/" className="flex items-center gap-2.5 justify-center mb-8">
        <img src={oPlanoLogo.url} alt="Logo" className="w-12 h-12 rounded-xl shadow-sm shrink-0 object-contain" />
        <span className="font-display font-bold text-2xl">O Plano</span>
      </Link>

      <Card className="w-full max-w-md p-5 sm:p-7 card-elevated">
        <div className="mb-5">
          <h1 className="text-2xl font-bold mb-1">Redefinir Senha</h1>
          <p className="text-sm text-muted-foreground">
            Digite e confirme sua nova senha para voltar a acessar o planner.
          </p>
        </div>

        {ready ? (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} placeholder="Mínimo 6 caracteres" required />
            </div>
            <div>
              <Label htmlFor="confirm-new-password">Confirme a Nova Senha</Label>
              <Input id="confirm-new-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} placeholder="Confirme a nova senha" required />
            </div>
            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Nova Senha"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Link de recuperação inválido ou expirado. Solicite um novo e-mail de recuperação.
            </p>
            <Button className="w-full" variant="secondary" onClick={() => nav({ to: "/auth" })}>
              Voltar para o login
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
