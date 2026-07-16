import type { LangPair, TranslationOrigin, TranslationSegment } from "./types";

const TM_KEY = "aihub-translator-memory-v1";

export interface MemoryEntry {
  id: string;
  source: string;
  translation: string;
  pair: LangPair;
  updatedAt: string;
}

function normalize(text: string) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function loadMemory(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(TM_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MemoryEntry[];
  } catch {
    return [];
  }
}

export function saveMemory(entries: MemoryEntry[]) {
  localStorage.setItem(TM_KEY, JSON.stringify(entries));
}

/** Exact match from approved history (Translation Memory). */
export function lookupMemory(
  source: string,
  pair: LangPair,
  memory: MemoryEntry[] = loadMemory()
): MemoryEntry | null {
  const key = normalize(source);
  if (!key) return null;
  return memory.find((e) => e.pair === pair && normalize(e.source) === key) ?? null;
}

/** Upsert approved segments into Memory for future reuse. */
export function rememberApprovedSegments(
  segments: Array<{ source: string; translation: string; approved: boolean }>,
  pair: LangPair
) {
  const approved = segments.filter((s) => s.approved && s.source.trim() && s.translation.trim());
  if (!approved.length) return loadMemory();

  const next = [...loadMemory()];
  for (const seg of approved) {
    const key = normalize(seg.source);
    const idx = next.findIndex((e) => e.pair === pair && normalize(e.source) === key);
    const entry: MemoryEntry = {
      id: idx >= 0 ? next[idx].id : crypto.randomUUID(),
      source: seg.source.trim(),
      translation: seg.translation.trim(),
      pair,
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) next[idx] = entry;
    else next.unshift(entry);
  }
  // keep last 500 entries
  const trimmed = next.slice(0, 500);
  saveMemory(trimmed);
  return trimmed;
}

export function originFromEngine(engine: "ai" | "mymemory" | "local"): TranslationOrigin {
  if (engine === "ai") return "llm";
  if (engine === "mymemory") return "online";
  return "local";
}

export function originStats(
  items: Array<{ origin?: TranslationOrigin | null; translation?: string }>
) {
  const total = items.length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const memory = items.filter((i) => i.origin === "memory").length;
  const llm = items.filter((i) => i.origin === "llm").length;
  const other = items.filter((i) => i.origin === "online" || i.origin === "local").length;
  return {
    memory,
    llm,
    other,
    memoryPct: pct(memory),
    llmPct: pct(llm),
    otherPct: pct(other),
  };
}

const DEMO_MEMORY_RUS_KAZ: Omit<MemoryEntry, "pair" | "updatedAt">[] = [
  {
    id: "demo-tm-1",
    source: "1. Кейсы агентов",
    translation: "1. Агенттер кейстері",
  },
  {
    id: "demo-tm-2",
    source: "Техническая спецификация",
    translation: "Техникалық сипаттама",
  },
  {
    id: "demo-tm-3",
    source: "Кейс 1: Q&A-агент по базе знаний",
    translation: "Кейс 1: Білім базасы бойынша Q&A-агент",
  },
  {
    id: "demo-tm-4",
    source: "Задача",
    translation: "Міндет",
  },
  {
    id: "demo-tm-5",
    source: "Введение",
    translation: "Кіріспе",
  },
  {
    id: "demo-tm-6",
    source: "Заключение",
    translation: "Қорытынды",
  },
  {
    id: "demo-tm-7",
    source: "Приложение",
    translation: "Қосымша",
  },
  {
    id: "demo-tm-8",
    source: "Наименование документа",
    translation: "Құжат атауы",
  },
  {
    id: "demo-tm-9",
    source: "Дата утверждения",
    translation: "Бекіту күні",
  },
  {
    id: "demo-tm-10",
    source: "Ответственный исполнитель",
    translation: "Жауапты орындаушы",
  },
];

/** Seed demo TM pairs for UX showcase (100% / hybrid / LLM bands). */
export function ensureDemoMemory(pair: LangPair = "RUS→KAZ") {
  if (pair !== "RUS→KAZ") return loadMemory();

  const now = new Date().toISOString();
  const demo: MemoryEntry[] = DEMO_MEMORY_RUS_KAZ.map((entry) => ({
    ...entry,
    pair,
    updatedAt: now,
  }));

  const current = loadMemory().filter((e) => !e.id.startsWith("demo-tm-"));
  const next = [...demo, ...current];
  saveMemory(next);
  return next;
}

export function syncMemoryFromTasks(tasks: Array<{ pair: LangPair; segments: TranslationSegment[] }>) {
  for (const task of tasks) {
    rememberApprovedSegments(task.segments, task.pair);
  }
}
