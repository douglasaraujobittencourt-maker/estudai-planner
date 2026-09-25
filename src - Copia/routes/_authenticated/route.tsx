import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Clock, Layers, Brain, TrendingUp, Settings2, LogOut, Menu, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";
import { FloatingTimer } from "@/components/floating-timer";
import { MotivationalPopup } from "@/components/motivational-popup";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfile } from "@/lib/planner-api";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    return { user: data?.user ?? null };
  },
  component: AppShell,
});

const NAV = [
  { to: "/app", label: "1 - Visão geral", icon: LayoutDashboard },
  { to: "/app/study", label: "2 - Bora Estudar", icon: Clock },
  { to: "/app/pdf-batteries", label: "3 - Divisão baterias PDF", icon: Layers },
  { to: "/app/reviews", label: "4 - Revisões", icon: Brain },
  { to: "/app/performance", label: "5 - Desempenho", icon: TrendingUp },
] as const;

function getInitials(name?: string | null): string {
  if (!name) return "US";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function AppShell() {
  const router = useRouter();
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  useEffect(() => {
    async function alignColors() {
      const { data: subjects } = await supabase.from("subjects").select("id, name, color");
      if (!subjects) return;

      const blue = "#0284C7";   // Sky-600 azul marcante escuro
      const lilac = "#7C3AED";  // Violet-600 roxo vibrante escuro
      const green = "#15803D";  // Green-700 verde escuro legível

      let updatedAny = false;

      for (const s of subjects) {
        if (s.name === "Cuidados e Rotinas Administrativas") {
          await supabase.from("subjects").update({ name: "Atendimento e Rotinas Administrativas" }).eq("id", s.id);
          s.name = "Atendimento e Rotinas Administrativas";
          updatedAny = true;
        }

        let targetColor = "";
        const name = s.name;

        if (/Português|Língua Portuguesa|Maria da Penha|11\.340|RIDE|PDPM|Mulheres|840|Servidores|7\.484|SEDES|LODF|Orgânica|Socorros|Básicos|Administrativo|Constitucional/i.test(name)) {
          targetColor = blue;
        } else if (/PNAS|Prato Cheio|7\.009|Benefícios|Eventuais|SISAN|Restaurante|SUAS|NOB|6\.938|Gás|7\.008|DF Social|Socioassistenciais/i.test(name)) {
          targetColor = lilac;
        } else if (/Atendimento|Rotinas|Arquivologia|Recursos|Materiais|Patrimônio|Compras|14\.133|Licitações|Específicos 2/i.test(name)) {
          targetColor = green;
        }

        if (targetColor && s.color !== targetColor) {
          await supabase.from("subjects").update({ color: targetColor }).eq("id", s.id);
          updatedAny = true;
        }
      }

      if (updatedAny) {
        qc.invalidateQueries({ queryKey: ["subjects"] });
        qc.invalidateQueries({ queryKey: ["cycle"] });
        qc.invalidateQueries({ queryKey: ["reviews-due"] });
        qc.invalidateQueries({ queryKey: ["cards-due"] });
      }
    }
    alignColors();
  }, [qc]);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Até já!");
    router.navigate({ to: "/auth", replace: true });
  };

  const userInitials = getInitials(profile?.display_name);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground relative">
      {/* Botão de Menu Mobile Flutuante e Discreto (Sem barra horizontal superior cortando o layout) */}
      <div className="md:hidden fixed top-3 left-3 z-40">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="p-2.5 rounded-xl bg-card/90 backdrop-blur-md border border-border/80 text-foreground shadow-lg hover:border-primary/40 active:scale-95 transition-all flex items-center justify-center"
              aria-label="Abrir menu lateral"
            >
              <Menu className="w-5 h-5 text-primary" />
            </button>
          </SheetTrigger>

          {/* MENU LATERAL MOBILE (DRAWER) */}
          <SheetContent side="left" className="p-0 flex flex-col justify-between bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-72">
            <div className="flex-1 flex flex-col min-h-0">
              {/* Cabeçalho do Drawer */}
              <div className="p-5 flex items-center gap-3 border-b border-sidebar-border">
                <div className="relative">
                  <img src="/favicon.svg" alt="Logo" className="w-10 h-10 rounded-2xl shadow-sm shrink-0 object-contain ring-1 ring-primary/30" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full ring-2 ring-sidebar" />
                </div>
                <div>
                  <div className="font-display font-extrabold text-base leading-tight tracking-tight text-foreground flex items-center gap-1.5">
                    EstudAI
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/20 text-primary font-bold tracking-wider">NEON</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">O Plano de Estudos</div>
                </div>
              </div>

              {/* Card de Perfil do Usuário */}
              <Link
                to="/app/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="mx-3.5 my-3 p-3 rounded-xl bg-card/60 hover:bg-card border border-border/60 flex items-center gap-3 transition-colors group"
              >
                <Avatar className="w-9 h-9 border border-primary/40 shadow-sm shrink-0">
                  <AvatarImage src="" alt={profile?.display_name || "Avatar"} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {profile?.display_name || "Estudante"}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="truncate">{profile?.exam_name || "Técnico do Seguro Social"}</span>
                  </div>
                </div>
              </Link>

              {/* Botão de Ação Primária (+ REGISTRAR ESTUDO) */}
              <div className="px-3.5 pb-2">
                <Link
                  to="/app/study"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs tracking-wider shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ REGISTRAR ESTUDO</span>
                </Link>
              </div>

              {/* Itens de Navegação */}
              <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-1">
                <nav className="space-y-1">
                  {NAV.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      activeOptions={{ exact: n.to === "/app" }}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-all"
                      activeProps={{
                        className: "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold bg-primary/15 text-primary border border-primary/30 shadow-[0_0_15px_-3px_rgba(34,197,94,0.25)]"
                      }}
                    >
                      <n.icon className="w-4 h-4 shrink-0" />
                      <span>{n.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Rodapé do Menu Mobile */}
            <div className="p-3.5 border-t border-sidebar-border bg-sidebar/50 space-y-2">
              <Link
                to="/app/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                activeProps={{
                  className: "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-foreground bg-sidebar-accent"
                }}
              >
                <Settings2 className="w-4 h-4 shrink-0" />
                <span>Configurações</span>
              </Link>

              {/* Seletor de Tema Toggle Pill */}
              <div className="flex items-center justify-between p-1 bg-card/70 border border-border/60 rounded-full text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex-1 py-1 rounded-full transition-all text-center ${
                    theme === "light"
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  LIGHT
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex-1 py-1 rounded-full transition-all text-center ${
                    theme === "dark"
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  DARK
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sair</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* DESKTOP SIDEBAR FIXA E ELEGANTE */}
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar hidden md:flex flex-col">
        {/* Cabeçalho da Sidebar */}
        <div className="p-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="relative">
            <img src="/favicon.svg" alt="Logo" className="w-10 h-10 rounded-2xl shadow-sm shrink-0 object-contain ring-1 ring-primary/30" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full ring-2 ring-sidebar" />
          </div>
          <div>
            <div className="font-display font-extrabold text-[15px] leading-tight tracking-tight text-sidebar-foreground flex items-center gap-1.5">
              EstudAI
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary/20 text-primary font-bold tracking-wider">NEON</span>
            </div>
            <div className="text-[10px] text-muted-foreground">O Plano de Estudos</div>
          </div>
        </div>

        {/* Card do Estudante */}
        <Link
          to="/app/settings"
          className="mx-3.5 my-3 p-2.5 rounded-xl bg-card/60 hover:bg-card border border-border/50 flex items-center gap-2.5 transition-colors group"
          title="Ver perfil e configurações"
        >
          <Avatar className="w-8 h-8 border border-primary/40 shadow-sm shrink-0">
            <AvatarImage src="" alt={profile?.display_name || "Avatar"} />
            <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {profile?.display_name || "Estudante"}
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="truncate">Online • Concurseiro</span>
            </div>
          </div>
        </Link>

        {/* Botão de Ação Primária (+ REGISTRAR ESTUDO) */}
        <div className="px-3.5 pb-2">
          <Link
            to="/app/study"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs tracking-wider shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ REGISTRAR ESTUDO</span>
          </Link>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/app" }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-all duration-200"
              activeProps={{
                className: "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold bg-primary/15 text-primary border border-primary/30 shadow-[0_0_15px_-3px_rgba(34,197,94,0.25)]"
              }}
            >
              <n.icon className="w-4 h-4 shrink-0" />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="p-3 border-t border-sidebar-border bg-sidebar/50 space-y-2">
          <Link
            to="/app/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
            activeProps={{
              className: "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-foreground bg-sidebar-accent"
            }}
          >
            <Settings2 className="w-4 h-4 shrink-0" /> Configurações
          </Link>

          {/* Desktop Theme Pill */}
          <div className="flex items-center justify-between p-1 bg-card/70 border border-border/60 rounded-full text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex-1 py-1 rounded-full transition-all text-center ${
                theme === "light"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              LIGHT
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex-1 py-1 rounded-full transition-all text-center ${
                theme === "dark"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              DARK
            </button>
          </div>

          <button
            onClick={signOut}
            className="w-full px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-destructive/15 hover:text-destructive flex items-center gap-3 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL (Sem topbar cortando a tela) */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>

      <FloatingTimer />
      <MotivationalPopup />
    </div>
  );
}
