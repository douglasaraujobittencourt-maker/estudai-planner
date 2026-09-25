import { createFileRoute, Outlet, Link, useRouter, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/external-client";
import { LayoutDashboard, Clock, Layers, Brain, TrendingUp, Settings2, LogOut, Menu, Plus, Sun, Moon, Home, Target, LineChart, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";
import { FloatingTimer } from "@/components/floating-timer";
import { MotivationalPopup } from "@/components/motivational-popup";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import oPlanoLogo from "@/assets/o-plano-cup.png.asset.json";
import inssLogo from "@/assets/inss-logo.webp";


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    try {
      const { ensureUserBootstrap } = await import("@/lib/planner-api");
      await ensureUserBootstrap();
    } catch { /* ignore */ }
    return { user: data.user };
  },
  component: AppShell,
});

const NAV = [
  { to: "/app", label: "1 - Visão geral", icon: LayoutDashboard },
  { to: "/app/study", label: "2 - Bora Estudar", icon: Clock },
  { to: "/app/pdf-batteries", label: "3 - Divisão baterias PDF", icon: Layers },
  { to: "/app/reviews", label: "4 - Revisões", icon: Brain },
  { to: "/app/performance", label: "5 - Desempenho", icon: TrendingUp },
  { to: "/app/settings", label: "Configurações", icon: Settings2 },
] as const;

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-1">
      <button
        onClick={() => setTheme("light")}
        className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${theme === "light" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70"}`}
        aria-label="Tema claro"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${theme === "dark" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70"}`}
        aria-label="Tema escuro"
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  );
}

function AppShell() {
  const router = useRouter();
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = Route.useRouteContext();

  const name =
    (user.user_metadata?.display_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Estudante";
  useEffect(() => {
    async function alignColors() {
      const { data: subjects } = await supabase.from("subjects").select("id, name, color");
      if (!subjects) return;

      const blue = "#0284C7";   // Sky-600 azul marcante escuro
      const lilac = "#7C3AED";  // Violet-600 roxo vibrante escuro
      const orange = "#F97316";

      let updatedAny = false;

      for (const s of subjects) {
        if (s.name === "Cuidados e Rotinas Administrativas") {
          await supabase.from("subjects").update({ name: "Atendimento e Rotinas Administrativas" }).eq("id", s.id);
          s.name = "Atendimento e Rotinas Administrativas";
          updatedAny = true;
        }

        let targetColor = "";
        const name = s.name;

        if (/Seguridade Social/i.test(name)) {
          targetColor = orange;
        } else if (/Português|Língua Portuguesa|Maria da Penha|11\.340|RIDE|PDPM|Mulheres|840|Servidores|7\.484|SEDES|LODF|Orgânica|Socorros|Básicos|Administrativo|Constitucional/i.test(name)) {
          targetColor = blue;
        } else if (/PNAS|Prato Cheio|7\.009|Benefícios|Eventuais|SISAN|Restaurante|SUAS|NOB|6\.938|Gás|7\.008|DF Social|Socioassistenciais/i.test(name)) {
          targetColor = lilac;
        } else if (/Atendimento|Rotinas|Arquivologia|Recursos|Materiais|Patrimônio|Compras|14\.133|Licitações|Específicos 2/i.test(name)) {
          targetColor = orange;
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

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar hidden md:flex flex-col sticky top-0 h-screen">
        <div className="px-5 pt-5 pb-2 flex justify-center items-center">
          <img
            src={oPlanoLogo.url}
            alt="O Plano"
              className="h-12 w-auto object-contain"
          />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/app" }}
              className="flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              activeProps={{ className: "flex items-center gap-3 px-3 py-3 rounded-2xl text-sm bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-sm" }}
            >
              <n.icon className="w-4 h-4 shrink-0" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button onClick={signOut} className="w-full p-3 rounded-2xl text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive/15 hover:text-destructive flex items-center gap-3 transition-colors">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>


      {/* Mobile header */}
      <header className="fixed top-0 inset-x-0 md:left-64 z-40 bg-royal text-primary-foreground rounded-b-2xl shadow-md flex items-center justify-between px-4 sm:px-6 h-16">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 rounded-xl text-primary-foreground hover:bg-primary-foreground/10 transition-colors shrink-0"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-foreground/15 font-display text-sm font-black">AP</div>
          <div className="hidden sm:block leading-tight">
            <p className="font-display text-sm font-extrabold">O Plano</p>
            <p className="text-[10px] text-primary-foreground/75">INSS · Técnico do Seguro Social</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />
          <div className="w-10 h-10 rounded-full bg-primary-foreground grid place-items-center shadow-sm overflow-hidden">
            <img src={inssLogo} alt="INSS" className="h-8 w-8 object-contain" />
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[80vw] max-w-sm p-0 bg-sidebar text-sidebar-foreground border-sidebar-border flex flex-col">
          <div className="px-5 pt-6 pb-4 flex justify-center items-center w-full">
            <img src={oPlanoLogo.url} alt="O Plano" className="h-16 w-auto object-contain" />
            <SheetTitle className="sr-only">Menu</SheetTitle>
          </div>

          <div className="px-4 pb-3">
            <Link
              to="/app/study"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground font-bold text-sm py-3 shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> REGISTRAR ESTUDO
            </Link>
          </div>

          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setDrawerOpen(false)}
                activeOptions={{ exact: n.to === "/app" }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                activeProps={{ className: "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-sidebar-primary text-sidebar-primary-foreground border border-sidebar-primary shadow-sm" }}
              >
                <n.icon className="w-4 h-4 shrink-0" /> {n.label}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-sidebar-border space-y-1">
            <Link
              to="/app/settings"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <Settings2 className="w-4 h-4" /> Configurações
            </Link>
            <button
              onClick={() => { setDrawerOpen(false); signOut(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive/15 hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </SheetContent>
      </Sheet>


      <main className="flex-1 min-w-0 pt-16">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40 h-16 rounded-2xl border border-border/70 bg-card/95 shadow-md backdrop-blur flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {[
          { to: "/app", label: "Início", icon: Home, exact: true },
          { to: "/app/study", label: "Estudos", icon: Clock, exact: false },
          { to: "/app/hours", label: "Metas", icon: Target, exact: false },
          { to: "/app/performance", label: "Desempenho", icon: LineChart, exact: false },
          { to: "/app/settings", label: "Perfil", icon: User, exact: false },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact }}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold text-muted-foreground"
            activeProps={{ className: "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold text-primary" }}
          >
            <item.icon className="h-5 w-5" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

      <FloatingTimer />
      <MotivationalPopup />
    </div>
  );
}
