// Dados extraídos da planilha "Cronograma SEDES TDAS" (abas
// "Edital Verticalizado" e "Questões x Disciplinas").

export type EditalTopic = { id: string; text: string; warn?: string };
export type EditalBlock = { id: string; title: string; topics: EditalTopic[] };

export const EDITAL_HEADER =
  "EDITAL VERTICALIZADO — SEDES-DF · Técnico Administrativo (Cargo 202) · Quadrix 2026";

export const EDITAL_BLOCKS: EditalBlock[] = [
  {
    id: "portugues",
    title: "Língua Portuguesa",
    topics: [
      { id: "pt-1", text: "1. Compreensão e interpretação de textos de gêneros variados" },
      { id: "pt-2", text: "2. Reconhecimento de tipos e gêneros textuais" },
      { id: "pt-3", text: "3. Domínio da ortografia oficial" },
      { id: "pt-4", text: "4. Domínio dos mecanismos de coesão textual" },
      { id: "pt-4-1", text: "4.1. Elementos de referenciação, substituição, repetição, conectores e sequenciação textual" },
      { id: "pt-4-2", text: "4.2. Emprego de tempos e modos verbais" },
      { id: "pt-5", text: "5. Domínio da estrutura morfossintática do período" },
      { id: "pt-5-1", text: "5.1. Emprego das classes de palavras" },
      { id: "pt-5-2", text: "5.2. Relações de coordenação entre orações e entre termos da oração" },
      { id: "pt-5-3", text: "5.3. Relações de subordinação entre orações e entre termos da oração" },
      { id: "pt-5-4", text: "5.4. Emprego dos sinais de pontuação" },
      { id: "pt-5-5", text: "5.5. Concordância verbal e nominal" },
      { id: "pt-5-6", text: "5.6. Regência verbal e nominal" },
      { id: "pt-5-7", text: "5.7. Emprego do sinal indicativo de crase" },
      { id: "pt-5-8", text: "5.8. Colocação dos pronomes átonos" },
      { id: "pt-6", text: "6. Reescrita de frases e parágrafos do texto" },
      { id: "pt-6-1", text: "6.1. Significação das palavras" },
      { id: "pt-6-2", text: "6.2. Substituição de palavras ou de trechos de texto" },
      { id: "pt-6-3", text: "6.3. Reorganização da estrutura de orações e de períodos do texto" },
      { id: "pt-6-4", text: "6.4. Reescrita de textos de diferentes gêneros e níveis de formalidade" },
    ],
  },
  {
    id: "df-legis",
    title: "Conhecimentos do DF, Política para Mulheres, Legislação e Primeiros Socorros",
    topics: [
      { id: "df-1", text: "1. Realidade étnica, social, histórica, geográfica, cultural, política e econômica do DF e da RIDE (LC Federal nº 94/1998; Decreto Federal nº 7.469/2011)" },
      { id: "df-2", text: "2. Plano Distrital de Política para Mulheres (PDPM)" },
      { id: "df-3", text: "3. Lei Orgânica do DF (Título VI – Da Ordem Social e do Meio Ambiente)" },
      { id: "df-4", text: "4. Lei Complementar nº 840/2011 e alterações" },
      { id: "df-4-1", text: "4.1. Título I – Das Disposições Preliminares" },
      { id: "df-4-2", text: "4.2. Título V – Dos Deveres" },
      { id: "df-4-3", text: "4.3. Título VI – Do Regime Disciplinar" },
      { id: "df-4-4", text: "4.4. Título VII – Dos Processos de Apuração de Infração Disciplinar" },
      { id: "df-5", text: "5. Lei Federal nº 11.340/2006 – Lei Maria da Penha", warn: "mínimo 3 questões na prova" },
      { id: "df-6", text: "6. Lei Distrital nº 7.484/2024" },
      { id: "df-7", text: "7. Noções básicas de primeiros socorros" },
      { id: "df-7-1", text: "7.1. Cuidados iniciais com a vítima" },
      { id: "df-7-2", text: "7.2. Reconhecimento de situações de urgência e emergência" },
      { id: "df-7-3", text: "7.3. Acionamento do socorro especializado" },
      { id: "df-7-4", text: "7.4. Condutas básicas em engasgo, sangramento, fratura, queimadura, desmaio, convulsão e intoxicação" },
    ],
  },
  {
    id: "suas",
    title: "Fundamentos, Organização, Gestão e Marcos Operacionais do SUAS",
    topics: [
      { id: "suas-1", text: "1. PNAS/2004 e organização da assistência social" },
      { id: "suas-1-1", text: "1.1. Princípios, diretrizes e objetivos" },
      { id: "suas-1-2", text: "1.2. Proteções afiançadas, Proteção Social Básica e Especial" },
      { id: "suas-1-3", text: "1.3. Matricialidade sociofamiliar, descentralização político-administrativa e territorialização" },
      { id: "suas-2", text: "2. SUAS: princípios, diretrizes, organização e seguranças socioassistenciais" },
      { id: "suas-2-1", text: "2.1. Foco em acolhida, convívio, renda e autonomia" },
      { id: "suas-3", text: "3. NOB/SUAS (2012)" },
      { id: "suas-3-1", text: "3.1. Responsabilidades dos entes, cofinanciamento, gestão do trabalho e vigilância socioassistencial" },
    ],
  },
  {
    id: "programas",
    title: "Programas, Benefícios e Instrumentos Socioassistenciais do DF",
    topics: [
      { id: "pr-1", text: "1. Programa Cartão Prato Cheio (Lei Distrital nº 7.009/2021; Decreto nº 42.873/2021)" },
      { id: "pr-2", text: "2. Programa Cartão Gás (Lei Distrital nº 6.938/2021; Decreto nº 42.376/2021)" },
      { id: "pr-3", text: "3. Plano DF Social (Lei Distrital nº 7.008/2021; Decreto nº 42.872/2021; Portaria nº 42/2023)" },
      { id: "pr-4", text: "4. Benefícios Eventuais da Política de Assistência Social do DF (Lei Distrital nº 5.165/2013; Decreto nº 35.191/2014)" },
      { id: "pr-5", text: "5. SISAN / Restaurante Comunitário (Seção II do Decreto nº 33.329/2011)" },
    ],
  },
  {
    id: "adm",
    title: "Direito Constitucional / Direito Administrativo / Rotinas Adm. e Arquivologia / Recursos Materiais",
    topics: [
      { id: "adm-1", text: "1. Noções de Direito Constitucional" },
      { id: "adm-1-1", text: "1.1. Constituição Federal de 1988: princípios fundamentais" },
      { id: "adm-1-2", text: "1.2. Direitos e garantias fundamentais (direitos e deveres individuais e coletivos; direitos sociais)" },
      { id: "adm-1-3", text: "1.3. Organização do Estado e da Administração Pública (disposições gerais e servidores públicos)" },
      { id: "adm-2", text: "2. Noções de Direito Administrativo e Legislação" },
      { id: "adm-2-1", text: "2.1. Estado, governo e administração pública (conceitos e elementos)" },
      { id: "adm-2-2", text: "2.2. Ato administrativo (conceito, requisitos, atributos, classificação e extinção – anulação e revogação)" },
      { id: "adm-2-3", text: "2.3. Poderes da Administração Pública (hierárquico, disciplinar, regulamentar e de polícia)" },
      { id: "adm-2-4", text: "2.4. Regime Jurídico dos Servidores do DF – LC nº 840/2011" },
      { id: "adm-3", text: "3. Atendimento, Rotinas Administrativas e Arquivologia" },
      { id: "adm-3-1", text: "3.1. Qualidade no atendimento ao público e trabalho em equipe" },
      { id: "adm-3-2", text: "3.2. Noções de redação oficial e comunicações administrativas" },
      { id: "adm-3-3", text: "3.3. Organização e controle de documentos (arquivologia, protocolo, tipos de arquivos, métodos, preservação e digitalização)" },
      { id: "adm-4", text: "4. Noções de Recursos Materiais, Patrimônio e Compras" },
      { id: "adm-4-1", text: "4.1. Administração de materiais (classificação, gestão de estoques e armazenagem)" },
      { id: "adm-4-2", text: "4.2. Gestão patrimonial (tombamento, controle, inventário e baixa de bens)" },
      { id: "adm-4-3", text: "4.3. Noções de compras no setor público – Lei Federal nº 14.133/2021" },
    ],
  },
];

// -------- Questões x Disciplinas --------

export type ImportanceRow = {
  discipline: string;
  questions: string;
  points: string;
  // grau de importância derivado da quantidade de questões / peso na prova
  weight: 1 | 2 | 3 | 4 | 5;
};
export type ImportanceGroup = {
  id: string;
  title: string;
  color: string;
  note?: string;
  rows: ImportanceRow[];
};

export const IMPORTANCE_GROUPS: ImportanceGroup[] = [
  {
    id: "basicos",
    title: "Conhecimentos Básicos — Todos os Cargos",
    color: "#38BDF8",
    note: "* Primeiros Socorros: pontuação avaliada separadamente (prova prática/oral conforme edital).",
    rows: [
      { discipline: "Português", questions: "6 a 8 questões", points: "6 a 8 pts", weight: 5 },
      { discipline: "Lei 11.340/2006 – Lei Maria da Penha", questions: "3 questões", points: "3 pts", weight: 4 },
      { discipline: "RIDE (LC Federal nº 94/1998)", questions: "2 questões", points: "2 pts", weight: 3 },
      { discipline: "PDPM – Plano Distrital de Política para Mulheres", questions: "2 questões", points: "2 pts", weight: 3 },
      { discipline: "LC 840/2011", questions: "2 questões", points: "2 pts", weight: 3 },
      { discipline: "Lei 7.484/2024 – Lei da SEDES", questions: "2 questões", points: "2 pts", weight: 3 },
      { discipline: "LODF – Lei Orgânica do DF", questions: "1 questão", points: "1 pt", weight: 2 },
      { discipline: "Primeiros Socorros", questions: "0 questões*", points: "20 pts*", weight: 5 },
    ],
  },
  {
    id: "especificos1",
    title: "Conhecimentos Específicos 1 — SUAS / Benefícios Sociais do DF",
    color: "#A78BFA",
    note: "* Estimativas baseadas em análise do professor — quantidades podem variar na prova real.",
    rows: [
      { discipline: "PNAS – Política Nacional de Assistência Social", questions: "~2 questões", points: "~2 pts", weight: 3 },
      { discipline: "Cartão Prato Cheio (Lei Distrital 7.009/2021)", questions: "1 a 2 questões", points: "1-2 pts", weight: 2 },
      { discipline: "Benefícios Eventuais da Assist. Social do DF", questions: "1 a 2 questões", points: "1-2 pts", weight: 2 },
      { discipline: "SISAN / Restaurantes Comunitários", questions: "1 a 2 questões", points: "1-2 pts", weight: 2 },
      { discipline: "SUAS e NOB SUAS – Norma Operacional Básica", questions: "~1 questão", points: "~1 pt", weight: 2 },
      { discipline: "Cartão Gás (Lei Distrital 6.938/2021)", questions: "1 questão", points: "1 pt", weight: 2 },
      { discipline: "DF Social (Lei Distrital 7.008/2021)", questions: "1 questão", points: "1 pt", weight: 2 },
    ],
  },
  {
    id: "especificos2",
    title: "Conhecimentos Específicos 2 — Técnico Administrativo",
    color: "#34D399",
    rows: [
      { discipline: "Atendimento, Rotinas Administrativas e Arquivologia", questions: "8 questões", points: "16 pts", weight: 5 },
      { discipline: "Noções de Direito Administrativo e Legislação", questions: "6 questões", points: "12 pts", weight: 5 },
      { discipline: "Noções de Recursos Materiais, Patrimônio e Compras", questions: "5 questões", points: "10 pts", weight: 4 },
      { discipline: "Noções de Direito Constitucional", questions: "4 questões", points: "8 pts", weight: 4 },
    ],
  },
];

export function weightLabel(w: number) {
  return ["", "Baixa", "Moderada", "Média", "Alta", "Crítica"][w] ?? "—";
}
