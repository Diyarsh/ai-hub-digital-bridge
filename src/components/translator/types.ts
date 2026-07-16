export type LangPair = "RUS→KAZ" | "KAZ→RUS" | "RUS→ENG" | "ENG→RUS";

export type TaskStatus = "processing" | "completed" | "approved";

export type SegmentMatch = "exact" | "fuzzy" | "new" | "manual";

/** Where the translation came from — for Memory vs LLM UX */
export type TranslationOrigin = "memory" | "llm" | "online" | "local";

export interface TranslationSegment {
  id: string;
  index: number;
  source: string;
  translation: string;
  match: SegmentMatch;
  confidence: number;
  approved: boolean;
  kind?: string;
  /** memory = approved history; llm = model; online/local = fallbacks */
  origin?: TranslationOrigin | null;
}

export interface TranslationTask {
  id: string;
  fileName: string;
  pair: LangPair;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  segments: TranslationSegment[];
}

export type GlossaryKind = "term" | "abbr";

export interface GlossaryEntry {
  id: string;
  source: string;
  translation: string;
  kind: GlossaryKind;
}

export type TranslatorView = "tasks" | "glossary" | "editor";
