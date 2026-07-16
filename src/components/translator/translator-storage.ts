import type { GlossaryEntry, TranslationTask } from "./types";

const TASKS_KEY = "aihub-translator-tasks-v1";
const GLOSSARY_KEY = "aihub-translator-glossary-v1";

const SEED_GLOSSARY: GlossaryEntry[] = [
  { id: "g1", source: "Абсолютная высота", translation: "Абсолюттік биіктік", kind: "term" },
  { id: "g2", source: "Абсорбционная установка", translation: "Абсорбциялық қондырғы", kind: "term" },
  { id: "g3", source: "Аварийная блокировка", translation: "Апаттық блоктау", kind: "term" },
  { id: "g4", source: "Аварийная остановка", translation: "Апаттық тоқтату", kind: "term" },
  { id: "g5", source: "Аварийный режим", translation: "Апаттық режим", kind: "term" },
  { id: "g6", source: "Автоматизированная система", translation: "Автоматтандырылған жүйе", kind: "term" },
  { id: "g7", source: "Техническая спецификация", translation: "Техникалық сипаттама", kind: "term" },
  { id: "g8", source: "ТОО", translation: "ЖШС", kind: "abbr" },
  { id: "g9", source: "НПА", translation: "НҚА", kind: "abbr" },
  { id: "g10", source: "ВНД", translation: "ІНҚ", kind: "abbr" },
];

export function loadTasks(): TranslationTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TranslationTask[];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: TranslationTask[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function loadGlossary(): GlossaryEntry[] {
  try {
    const raw = localStorage.getItem(GLOSSARY_KEY);
    if (!raw) {
      localStorage.setItem(GLOSSARY_KEY, JSON.stringify(SEED_GLOSSARY));
      return SEED_GLOSSARY;
    }
    return JSON.parse(raw) as GlossaryEntry[];
  } catch {
    return SEED_GLOSSARY;
  }
}

export function saveGlossary(entries: GlossaryEntry[]) {
  localStorage.setItem(GLOSSARY_KEY, JSON.stringify(entries));
}

/** @deprecated use localFallbackTranslate from translator.service */
export function mockTranslateSegment(source: string, pair: string): string {
  const from = pair.startsWith("KAZ") ? "KAZ" : pair.startsWith("ENG") ? "ENG" : "RUS";
  const to = pair.includes("→KAZ") || pair.endsWith("KAZ") ? "KAZ" : pair.includes("→ENG") ? "ENG" : "RUS";
  // dynamic import avoided — keep simple glossary-only for old callers
  const glossary = loadGlossary();
  let result = source;
  for (const entry of glossary) {
    if (result.includes(entry.source)) {
      result = result.split(entry.source).join(entry.translation);
    }
  }
  return result === source ? `[${to}] ${source}` : result;
}

export function splitIntoSegments(text: string): string[] {
  const parts = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    return text
      .split(/(?<=[.!?…])\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return parts;
}
