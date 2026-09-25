import { useStudyTimer } from "@/hooks/use-study-timer";
import { Link, useRouterState } from "@tanstack/react-router";
import { PlayCircle, Pause, RotateCcw, Timer } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { playAlarm } from "@/lib/alarm";

export function FloatingTimer() {
  const { pathname } = useRouterState({ select: (s) => s.location });
  const timer = useStudyTimer();

  // Alarme quando a contagem chega a zero (também fora da página de estudo)
  const alarmedRef = useRef(false);
  useEffect(() => {
    if (timer.remaining > 0) { alarmedRef.current = false; return; }
    if (!timer.running || alarmedRef.current) return;
    alarmedRef.current = true;
    toast.success("Tempo esgotado! Registre sua sessão. ⏰");
    playAlarm();
  }, [timer.remaining, timer.running]);

  // Hide on the study page itself (main controls live there)
  if (pathname.startsWith("/app/study")) return null;

  const mm = String(Math.floor(timer.remaining / 60)).padStart(2, "0");
  const ss = String(timer.remaining % 60).padStart(2, "0");
  const showRemaining = timer.remaining > 0 || timer.running;
  const label = showRemaining ? `${mm}:${ss}` : "00:00";

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 z-50 flex items-center gap-2 rounded-full bg-card/95 backdrop-blur border border-border shadow-lg px-3 py-2">
      <Timer className="w-4 h-4 text-primary" />
      <span className="font-mono text-sm font-bold tabular-nums w-14 text-center text-primary">{label}</span>
      <button
        onClick={() => (timer.running ? timer.pause() : timer.start())}
        className="p-1.5 rounded-full hover:bg-muted transition-colors"
        aria-label={timer.running ? "Pausar" : "Iniciar"}
      >
        {timer.running ? <Pause className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
      </button>
      <button
        onClick={timer.reset}
        className="p-1.5 rounded-full hover:bg-muted transition-colors"
        aria-label="Zerar"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
      <Link
        to="/app/study"
        className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground hover:opacity-90"
      >
        Abrir
      </Link>
    </div>
  );
}
