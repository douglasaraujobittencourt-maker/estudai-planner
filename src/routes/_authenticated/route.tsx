import { createFileRoute, Outlet, Link, useRouter, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/external-client";
import { LayoutDashboard, Clock, Layers, Brain, TrendingUp, BookOpenCheck, Settings2, LogOut, Menu, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";
import { FloatingTimer } from "@/components/floating-timer";
import { MotivationalPopup } from "@/components/motivational-popup";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import oPlanoLogo from "@/assets/o-plano-cup.png.asset.json";


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
    <div className="flex items-center rounded-full border border-sidebar-border bg-sidebar-accent/50 p-0.5">
      <button
        onClick={() => setTheme("light")}
        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-colors ${theme === "light" ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/70"}`}
        aria-label="Tema claro"
      >
        LIGHT
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-colors ${theme === "dark" ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/70"}`}
        aria-label="Tema escuro"
      >
        DARK
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
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");


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

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar hidden md:flex flex-col">
        <div className="px-5 pt-5 pb-2 flex justify-center items-center">
          <img
            src={oPlanoLogo.url}
            alt="O Plano"
            className="h-10 w-auto md:h-12 lg:h-14 object-contain"
          />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/app" }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              activeProps={{ className: "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm" }}
            >
              <n.icon className="w-4 h-4 shrink-0" /> {n.label}
            </Link>
          ))}
          <div className="px-3 py-2.5">
            <ThemeToggle />
          </div>
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button onClick={signOut} className="w-full p-3 rounded-2xl text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive/15 hover:text-destructive flex items-center gap-3 transition-colors">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>


      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur border-b border-sidebar-border flex items-center justify-between px-4 h-14">
        <div className="flex items-center">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors shrink-0"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        </div>
      </div>

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
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-lime-400 text-stone-950 font-bold text-sm py-3 shadow-sm hover:bg-lime-300 transition-colors"
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
                activeProps={{ className: "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-lime-400/20 text-lime-900 dark:text-lime-300 border border-lime-400/30" }}
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


      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>

      <FloatingTimer />
      <MotivationalPopup />
    </div>
  );
}
