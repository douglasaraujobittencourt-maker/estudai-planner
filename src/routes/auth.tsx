import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/external-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import oPlanoLogo from "@/assets/o-plano-cup.png.asset.json";
import { ensureUserBootstrap } from "@/lib/planner-api";


export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState<"primeiro-acesso" | "aluno">("primeiro-acesso");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/app" });
    });
  }, [nav]);

  const resetFields = () => {
    setPassword("");
    setConfirmPassword("");
  };

  const handlePrimeiroAcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || password.length < 6) {
      toast.error("Preencha o e-mail e uma senha de pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { data: buyer, error: buyerError } = await (supabase as any)
        .from("allowed_buyers")
        .select("email")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (buyerError) throw buyerError;

      if (!buyer) {
        toast.error("Este e-mail ainda não possui uma compra ativa. Adquira seu acesso no site oficial.");
        setLoading(false);
        return;
      }

      const displayName = name.trim() || normalizedEmail.split("@")[0];
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin + "/app" },
      });

      if (error) throw error;

      toast.success("Acesso ativado! Entre com seu e-mail e senha.");
      setActiveTab("aluno");
      resetFields();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao ativar acesso");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await ensureUserBootstrap();
      nav({ to: "/app" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Digite seu e-mail acima para redefinir a senha.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: "https://estudai-planner.lovable.app/reset-password",
      });
      if (error) throw error;
      toast.success("Enviamos um link de recuperação para o seu e-mail.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar e-mail de recuperação");
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
        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v as "primeiro-acesso" | "aluno");
          resetFields();
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-5 h-11 bg-muted rounded-xl p-1">
            <TabsTrigger value="primeiro-acesso" className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
              Primeiro Acesso
            </TabsTrigger>
            <TabsTrigger value="aluno" className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
              Já sou Aluno
            </TabsTrigger>
          </TabsList>

          <TabsContent value="primeiro-acesso" className="mt-0">
            <div className="mb-5">
              <h1 className="text-2xl font-bold mb-1">Ativar meu Planner</h1>
              <p className="text-sm text-muted-foreground">
                Digite o mesmo e-mail utilizado na compra para liberar seu acesso.
              </p>
            </div>

            <form onSubmit={handlePrimeiroAcesso} className="space-y-4">
              <div>
                <Label htmlFor="signup-name">Nome</Label>
                <Input id="signup-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamado?" />
              </div>
              <div>
                <Label htmlFor="signup-email">E-mail</Label>
                <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                <p className="text-xs text-muted-foreground mt-1.5">Importante: use o e-mail da Hotmart.</p>
              </div>
              <div>
                <Label htmlFor="signup-password">Criar Senha</Label>
                <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} placeholder="Mínimo 6 caracteres" required />
              </div>
              <div>
                <Label htmlFor="signup-confirm">Confirmar Senha</Label>
                <Input id="signup-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} placeholder="Repita a senha" required />
              </div>
              <Button type="submit" className="w-full font-semibold" disabled={loading}>
                {loading ? "Ativando..." : "Ativar e Acessar Planner"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="aluno" className="mt-0">
            <div className="mb-5">
              <h1 className="text-2xl font-bold mb-1">Acessar minha conta</h1>
              <p className="text-sm text-muted-foreground">
                Entre com seus dados cadastrados para continuar seus estudos.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">E-mail</Label>
                <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div>
                <Label htmlFor="login-password">Senha</Label>
                <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" required />
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={handleForgotPassword} className="text-xs text-muted-foreground hover:text-foreground underline decoration-transparent hover:decoration-current transition-colors">
                  Esqueci minha senha
                </button>
              </div>
              <Button type="submit" className="w-full" variant="secondary" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
