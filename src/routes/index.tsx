import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "O Plano — Planner de Estudos" },
      { name: "description", content: "Organize seus estudos para concursos com ciclo, revisões, flashcards e acompanhamento de desempenho." },
      { property: "og:title", content: "O Plano — Planner de Estudos" },
      { property: "og:description", content: "Organize seus estudos para concursos com ciclo, revisões, flashcards e acompanhamento de desempenho." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
});
