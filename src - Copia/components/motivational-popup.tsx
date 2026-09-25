import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";

const FRASES = [
  "📚 \"Você não estuda para passar, estuda até passar\" — William Douglas",
  "💪 \"A dor é temporária mas o cargo é para sempre\" — William Douglas",
  "⏳ \"A diferença entre o sonho e a realidade é apenas a quantidade certa de tempo e trabalho\" — William Douglas",
  "🏠 Continue! Logo logo você estará trabalhando em home office!",
  "💰 Não pare! Muito em breve o seu contra-cheque será de 10 mil reais!",
  "🏥 A sua família terá o melhor plano de saúde!",
  "❤️ Prossiga. Você vai poder ajudar a sua mãezinha!",
  "💍 A sua esposa terá orgulho de você!",
  "🎓 Muito em breve a Rebeca e o Bernardo estarão na melhor escola!",
  "🎸 Estudar pra quê? Para comprar seus perfumes, guitarras, suas coisinhas...",
];

// Intervalo entre popups: entre 4 e 8 minutos (em ms)
const MIN_INTERVAL = 4 * 60 * 1000;
const MAX_INTERVAL = 8 * 60 * 1000;

function randomInterval() {
  return Math.floor(Math.random() * (MAX_INTERVAL - MIN_INTERVAL + 1)) + MIN_INTERVAL;
}

export function MotivationalPopup() {
  const [visible, setVisible] = useState(false);
  const [frase, setFrase] = useState("");
  const [animating, setAnimating] = useState(false);
  const [lastIndex, setLastIndex] = useState(-1);

  const show = useCallback(() => {
    // Escolhe uma frase diferente da última
    let idx: number;
    do {
      idx = Math.floor(Math.random() * FRASES.length);
    } while (idx === lastIndex && FRASES.length > 1);
    setLastIndex(idx);
    setFrase(FRASES[idx]);
    setAnimating(false);
    setVisible(true);
  }, [lastIndex]);

  const dismiss = useCallback(() => {
    setAnimating(true);
    setTimeout(() => setVisible(false), 400);
  }, []);

  // Auto-dismiss após 12 segundos
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => dismiss(), 12000);
    return () => clearTimeout(t);
  }, [visible, dismiss]);

  // Agenda o próximo popup
  useEffect(() => {
    // Primeiro popup: aparece após 15 segundos (para teste)
    const firstDelay = 15 * 1000;
    const first = setTimeout(() => {
      show();
      // Depois do primeiro, agenda os seguintes em loop
      const schedule = () => {
        const t = setTimeout(() => {
          show();
          schedule();
        }, randomInterval());
        return t;
      };
      schedule();
    }, firstDelay);

    return () => clearTimeout(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-24 md:bottom-6 left-4 z-[999] w-[calc(100vw-2rem)] sm:max-w-sm
        transition-all duration-400 ease-out
        ${animating
          ? "opacity-0 translate-y-4 scale-95"
          : "opacity-100 translate-y-0 scale-100"
        }`}
    >
      <div className="relative rounded-2xl border border-border bg-card/95 backdrop-blur px-4 py-3.5">
        {/* Botão fechar */}
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Conteúdo */}
        <div className="flex items-start gap-2.5 pr-4">
          <div className="text-xl select-none mt-0.5">🚀</div>
          <p className="text-xs sm:text-sm font-medium leading-relaxed text-foreground">
            {frase}
          </p>
        </div>

        {/* Barra de progresso (12s) */}
        <div className="mt-2.5 h-1 w-full rounded-full bg-muted/60 overflow-hidden">
          <div
            className="h-full bg-primary/70 rounded-full"
            style={{
              animation: "shrink 12s linear forwards",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
