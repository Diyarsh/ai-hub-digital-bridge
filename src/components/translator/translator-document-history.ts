import type { DocumentBlock } from "@/services/translator/document-import";
import type { SegmentMatch, TranslationOrigin } from "./types";

export const TRANSLATOR_HISTORY_KEY = "aihub-translator-document-history-v1";
export const TRANSLATOR_HISTORY_UPDATED_EVENT = "translator.history.updated";

export type TranslatorHistoryPair = "RUS→KAZ" | "KAZ→RUS" | "RUS→ENG" | "ENG→RUS";

export interface TranslatorHistoryPart {
  text: string;
  from: "memory" | "llm";
}

export interface TranslatorHistoryBlock extends DocumentBlock {
  translation: string;
  approved: boolean;
  match: SegmentMatch;
  confidence: number;
  origin?: TranslationOrigin | null;
  tableRowsTranslated?: string[][];
  translationParts?: TranslatorHistoryPart[];
  sourceMemorySpans?: string[];
}

export interface TranslatorDocumentHistoryItem {
  id: string;
  fileName: string;
  pair: TranslatorHistoryPair;
  createdAt: string;
  updatedAt: string;
  blocks: TranslatorHistoryBlock[];
}

function notifyHistoryUpdated() {
  window.dispatchEvent(new CustomEvent(TRANSLATOR_HISTORY_UPDATED_EVENT));
}

export function loadTranslatorDocumentHistory(): TranslatorDocumentHistoryItem[] {
  try {
    const raw = localStorage.getItem(TRANSLATOR_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TranslatorDocumentHistoryItem[];
    return Array.isArray(parsed)
      ? parsed.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      : [];
  } catch {
    return [];
  }
}

export function getTranslatorDocumentHistoryItem(
  id: string
): TranslatorDocumentHistoryItem | null {
  return loadTranslatorDocumentHistory().find((item) => item.id === id) ?? null;
}

export function saveTranslatorDocumentHistoryItem(
  item: TranslatorDocumentHistoryItem
) {
  const history = loadTranslatorDocumentHistory();
  const existing = history.find((entry) => entry.id === item.id);
  const nextItem = {
    ...item,
    createdAt: existing?.createdAt ?? item.createdAt,
  };
  const next = [nextItem, ...history.filter((entry) => entry.id !== item.id)].slice(0, 20);
  localStorage.setItem(TRANSLATOR_HISTORY_KEY, JSON.stringify(next));
  notifyHistoryUpdated();
}

export function deleteTranslatorDocumentHistoryItem(id: string) {
  const next = loadTranslatorDocumentHistory().filter((item) => item.id !== id);
  localStorage.setItem(TRANSLATOR_HISTORY_KEY, JSON.stringify(next));
  notifyHistoryUpdated();
}
