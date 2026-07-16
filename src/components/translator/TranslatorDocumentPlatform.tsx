import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  Columns2,
  Download,
  FileText,
  Languages,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  Square,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  readDocumentBlocks,
  type DocBlockTag,
  type DocumentBlock,
} from "@/services/translator/document-import";
import {
  isTranslatorConfigured,
  translateSegmentRobust,
  type TranslatorLanguage,
} from "@/services/translator/translator.service";
import type { GlossaryEntry, SegmentMatch, TranslationOrigin } from "./types";
import { loadGlossary, saveGlossary } from "./translator-storage";
import { GlossaryView } from "./GlossaryView";
import {
  ensureDemoMemory,
  lookupMemory,
  rememberApprovedSegments,
} from "./translation-memory";

const BRONZE = {
  deep: "#A17436",
  mid: "#B8924F",
  light: "#D4B483",
  bg: "#F7F1E8",
  surface: "#FBF8F4",
};

type LangPair = "RUS→KAZ" | "KAZ→RUS" | "RUS→ENG" | "ENG→RUS";
type ViewMode = "document" | "split";
type Screen = "workspace" | "glossary";
type MemoryBand = "exact" | "hybrid" | "llm";

/** Demo targets so green / blue / yellow cases rotate across blocks */
const DEMO_MEMORY_TARGETS = [100, 80, 45] as const;

const PAIR_OPTIONS: {
  value: LangPair;
  label: string;
  from: TranslatorLanguage;
  to: TranslatorLanguage;
}[] = [
  { value: "RUS→KAZ", label: "Русский → Казахский", from: "RUS", to: "KAZ" },
  { value: "KAZ→RUS", label: "Казахский → Русский", from: "KAZ", to: "RUS" },
  { value: "RUS→ENG", label: "Русский → Английский", from: "RUS", to: "ENG" },
  { value: "ENG→RUS", label: "Английский → Русский", from: "ENG", to: "RUS" },
];

interface EditableBlock extends DocumentBlock {
  translation: string;
  approved: boolean;
  match: SegmentMatch;
  confidence: number;
  origin?: TranslationOrigin | null;
  translating?: boolean;
  tableRowsTranslated?: string[][];
  /** Which fragments are Memory vs LLM (for 75–99% blocks) */
  translationParts?: TextPart[];
  /** Source spans that came from Memory (glossary / TM terms) */
  sourceMemorySpans?: string[];
}

type TextPart = { text: string; from: "memory" | "llm" };

function splitByPhrases(text: string, memoryPhrases: string[]): TextPart[] {
  if (!text) return [];
  const unique = [...new Set(memoryPhrases.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!unique.length) return [{ text, from: "llm" }];

  type Hit = { start: number; end: number; phrase: string };
  const hits: Hit[] = [];
  const occupied = new Array(text.length).fill(false);

  for (const phrase of unique) {
    let from = 0;
    while (from < text.length) {
      const idx = text.indexOf(phrase, from);
      if (idx < 0) break;
      const end = idx + phrase.length;
      let overlaps = false;
      for (let i = idx; i < end; i++) {
        if (occupied[i]) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        hits.push({ start: idx, end, phrase });
        for (let i = idx; i < end; i++) occupied[i] = true;
      }
      from = idx + 1;
    }
  }

  hits.sort((a, b) => a.start - b.start);
  const parts: TextPart[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start > cursor) {
      parts.push({ text: text.slice(cursor, hit.start), from: "llm" });
    }
    parts.push({ text: hit.phrase, from: "memory" });
    cursor = hit.end;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), from: "llm" });
  }
  return parts.length ? parts : [{ text, from: "llm" }];
}

/**
 * Block bands by % of text from Memory:
 * 100% — Memory (green)
 * 75–99% — Гибрид (blue; click = fragment split)
 * <75% — Новый (yellow; full LLM generation)
 */

function memoryPctFromParts(parts: TextPart[] | undefined, fallbackText = ""): number {
  if (parts?.length) {
    const total = parts.reduce((sum, part) => sum + part.text.length, 0) || 1;
    const memoryLen = parts
      .filter((part) => part.from === "memory")
      .reduce((sum, part) => sum + part.text.length, 0);
    return Math.round((memoryLen / total) * 100);
  }
  return fallbackText.trim() ? 0 : 0;
}

function memoryPctFromBlock(block: EditableBlock): number {
  if (block.approved) return 100;
  return memoryPctFromParts(block.translationParts, block.translation);
}

function memoryBandFromPct(pct: number): MemoryBand {
  if (pct >= 100) return "exact";
  if (pct >= 75) return "hybrid";
  return "llm";
}

function memoryBandFromBlock(block: EditableBlock): MemoryBand {
  return memoryBandFromPct(memoryPctFromBlock(block));
}

function memoryPctColor(pct: number): string {
  if (pct >= 100) return "#047857";
  if (pct >= 75) return "#1D4ED8";
  return "#CA8A04";
}

function buildDemoMemoryParts(
  text: string,
  targetPct: number,
  source: string
): { parts: TextPart[]; sourceMemorySpans: string[] } {
  const trimmed = text.trim();
  if (!trimmed) return { parts: [], sourceMemorySpans: [] };

  if (targetPct >= 100) {
    return {
      parts: [{ text: trimmed, from: "memory" }],
      sourceMemorySpans: [source.trim()],
    };
  }
  if (targetPct <= 0) {
    return { parts: [{ text: trimmed, from: "llm" }], sourceMemorySpans: [] };
  }

  const ratio = targetPct / 100;
  let cut = Math.round(trimmed.length * ratio);
  const spaceAfter = trimmed.indexOf(" ", cut);
  if (spaceAfter > 0 && spaceAfter < trimmed.length - 1) {
    cut = spaceAfter + 1;
  }

  const memText = trimmed.slice(0, cut);
  const llmText = trimmed.slice(cut);
  const parts: TextPart[] = [];
  if (memText) parts.push({ text: memText, from: "memory" });
  if (llmText) parts.push({ text: llmText, from: "llm" });

  const sourceCut = Math.max(1, Math.round(source.length * ratio));
  const sourceSpan =
    source.slice(0, sourceCut).trim() ||
    source
      .split(/\s+/)
      .slice(0, Math.max(2, Math.ceil(source.split(/\s+/).length * ratio)))
      .join(" ");

  return { parts, sourceMemorySpans: memText ? [sourceSpan] : [] };
}

function applyDemoMemoryCase(
  block: EditableBlock,
  translation: string,
  index: number
): EditableBlock {
  const targetPct = DEMO_MEMORY_TARGETS[index % DEMO_MEMORY_TARGETS.length];
  const { parts, sourceMemorySpans } = buildDemoMemoryParts(translation, targetPct, block.source);
  return applyTranslationMeta(
    block,
    translation,
    parts,
    sourceMemorySpans,
    targetPct >= 100 ? "memory" : "llm",
    targetPct >= 100 ? "exact" : targetPct >= 75 ? "fuzzy" : "new"
  );
}

/** Thin outline only — no block background wash */
function blockActiveStyle(isActive: boolean): CSSProperties | undefined {
  if (!isActive) return undefined;
  return { boxShadow: `inset 0 0 0 2px ${BRONZE.mid}` };
}

function applyTranslationMeta(
  block: EditableBlock,
  translation: string,
  parts: TextPart[],
  sourceMemorySpans: string[],
  origin: TranslationOrigin,
  match: SegmentMatch
): EditableBlock {
  const memoryPct = memoryPctFromParts(parts, translation);
  return {
    ...block,
    translation,
    translationParts: parts,
    sourceMemorySpans,
    origin,
    match,
    confidence: memoryPct,
    approved: false,
    translating: false,
  };
}

function partsToHtml(parts: TextPart[]) {
  return parts
    .map((p) => {
      const style =
        p.from === "memory"
          ? "background:#BBF7D0;color:#14532D;border-radius:2px;padding:0 2px"
          : "background:#BFDBFE;color:#1E3A8A;border-radius:2px;padding:0 2px";
      const escaped = p.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<span style="${style}">${escaped}</span>`;
    })
    .join("");
}

function HybridBlockEditor({
  block,
  tag: Tag,
  isTranslating,
  showMarks,
  blockClassName,
  headingColor: hColor,
  onFocus,
  onBlur,
  onKeyDown,
}: {
  block: EditableBlock;
  tag: keyof JSX.IntrinsicElements;
  isTranslating: boolean;
  /** True only while cursor/focus is inside this block */
  showMarks: boolean;
  blockClassName: string;
  headingColor?: string;
  onFocus: () => void;
  onBlur: (text: string) => void;
  onKeyDown: (e: KeyboardEvent) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const band = memoryBandFromPct(memoryPctFromBlock(block));
  const showHybridParts =
    showMarks && band === "hybrid" && Boolean(block.translationParts?.length);

  const applyContent = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    if (block.translating) {
      el.textContent = "Переводим…";
      return;
    }

    const text = block.translation || "";
    const focused = document.activeElement === el;

    if (showHybridParts && block.translationParts?.length) {
      el.innerHTML = partsToHtml(block.translationParts);
      if (focused) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      return;
    }

    // Always clear marks when cursor leaves / marks off
    el.textContent = text;
  }, [block.translation, block.translationParts, block.translating, showHybridParts]);

  useEffect(() => {
    applyContent();
  }, [applyContent, showMarks, showHybridParts]);

  const Cmp = Tag as "div";
  return (
    <Cmp
      ref={ref as React.Ref<HTMLDivElement>}
      data-edit-id={block.id}
      contentEditable={!isTranslating && !block.translating}
      suppressContentEditableWarning
      className={cn(
        blockClassName,
        "outline-none min-h-[1.5em] flex-1 min-w-0 !mb-0 !mt-0 cursor-text",
        block.translating && "opacity-50"
      )}
      style={{ color: hColor || "#1E293B" }}
      onFocus={onFocus}
      onBlur={(e) => {
        const text = (e.currentTarget.textContent || "").trim();
        onBlur(text);
        // Clear marks after blur (parent clears focusedId)
        requestAnimationFrame(() => {
          const el = ref.current;
          if (el && document.activeElement !== el) {
            el.textContent = block.translation || text;
          }
        });
      }}
      onKeyDown={onKeyDown}
    />
  );
}

function highlightSourceText(source: string, memorySpans: string[] | undefined) {
  if (!memorySpans?.length) return source;
  const parts = splitByPhrases(source, memorySpans);
  return parts.map((p, i) =>
    p.from === "memory" ? (
      <mark
        key={i}
        className="rounded-sm px-0.5"
        style={{ background: "#BBF7D0", color: "#14532D" }}
        title="Memory"
      >
        {p.text}
      </mark>
    ) : (
      <mark
        key={i}
        className="rounded-sm px-0.5"
        style={{ background: "#BFDBFE", color: "#1E3A8A" }}
        title="AI"
      >
        {p.text}
      </mark>
    )
  );
}

/** For <75% (Новый): only mark what exists in Memory; rest stays plain */
function highlightSourceMemoryOnly(source: string, memorySpans: string[] | undefined) {
  if (!memorySpans?.length) return source;
  const parts = splitByPhrases(source, memorySpans);
  return parts.map((p, i) =>
    p.from === "memory" ? (
      <mark
        key={i}
        className="rounded-sm px-0.5"
        style={{ background: "#BBF7D0", color: "#14532D" }}
        title="Уже есть в Memory"
      >
        {p.text}
      </mark>
    ) : (
      <span key={i}>{p.text}</span>
    )
  );
}

function pairMeta(pair: LangPair) {
  return PAIR_OPTIONS.find((p) => p.value === pair) ?? PAIR_OPTIONS[0];
}

function classifyMatch(source: string, index: number, glossary: GlossaryEntry[]): {
  match: SegmentMatch;
  confidence: number;
} {
  const glossaryHit = glossary.some((g) => source.includes(g.source));
  const match: SegmentMatch = glossaryHit ? "exact" : index % 7 === 0 ? "new" : "fuzzy";
  const confidence = match === "new" ? 0 : match === "exact" ? 100 : 60;
  return { match, confidence };
}

function blockStats(blocks: EditableBlock[]) {
  const total = blocks.length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const exact = blocks.filter((b) => b.match === "exact").length;
  const fuzzy = blocks.filter((b) => b.match === "fuzzy").length;
  const neu = blocks.filter((b) => b.match === "new").length;
  const review = blocks.filter((b) => !b.approved).length;
  const approved = blocks.filter((b) => b.approved).length;
  const translated = blocks.filter(
    (b) => Boolean(b.translation?.trim()) || Boolean(b.tableRowsTranslated?.length)
  ).length;
  return {
    total,
    exact,
    fuzzy,
    neu,
    review,
    approved,
    translated,
    exactPct: pct(exact),
    fuzzyPct: pct(fuzzy),
    neuPct: pct(neu),
    reviewPct: pct(review),
    approvedPct: pct(approved),
    translatedPct: pct(translated),
  };
}

/** Стили ближе к Word (Arial + синие заголовки), а не «карточки» */
function blockClass(tag: DocBlockTag) {
  switch (tag) {
    case "h1":
      return "text-[22px] font-bold tracking-tight mb-3 mt-6 first:mt-0 font-sans";
    case "h2":
      return "text-[18px] font-bold tracking-tight mb-2.5 mt-5 font-sans";
    case "h3":
      return "text-[16px] font-bold mb-2 mt-4 font-sans";
    case "h4":
      return "text-[15px] font-bold mb-2 mt-3 font-sans";
    case "li":
      return "text-[14.5px] leading-[1.55] mb-1.5 list-item list-disc ml-6 font-sans";
    case "blockquote":
      return "text-[14.5px] leading-[1.55] italic border-l-[3px] pl-4 my-3 text-slate-600 font-sans";
    case "table":
      return "";
    default:
      return "text-[14.5px] leading-[1.55] mb-3 font-sans text-slate-900";
  }
}

function MatchBadge({
  memoryPct,
  band,
}: {
  memoryPct: number;
  band: MemoryBand;
}) {
  return (
    <span
      className="text-[11px] font-semibold tabular-nums shrink-0"
      style={{ color: memoryPctColor(memoryPct) }}
      title={
        band === "exact"
          ? "100% совпадение с Memory"
          : band === "hybrid"
            ? `${memoryPct}% совпадение с Memory (гибрид)`
            : `${memoryPct}% совпадение с Memory (новый)`
      }
    >
      {memoryPct}%
    </span>
  );
}

function headingColor(tag: DocBlockTag): string | undefined {
  if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") return "#2F5496";
  return undefined;
}

function DocTable({
  rows,
  editable,
  onChange,
}: {
  rows: string[][];
  editable?: boolean;
  onChange?: (rows: string[][]) => void;
}) {
  if (!rows.length) return null;
  return (
    <div className="my-4 overflow-x-auto rounded border" style={{ borderColor: "#BDD7EE" }}>
      <table className="w-full text-[13px] border-collapse font-sans">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const isHeader = ri === 0;
                const Cell = isHeader ? "th" : "td";
                return (
                  <Cell
                    key={ci}
                    contentEditable={editable}
                    suppressContentEditableWarning
                    className={cn(
                      "border px-3 py-2 text-left align-top outline-none",
                      isHeader && "font-semibold"
                    )}
                    style={{
                      borderColor: "#BDD7EE",
                      background: isHeader ? "#D6E3F0" : "white",
                      color: "#1E293B",
                    }}
                    onBlur={(e) => {
                      if (!onChange) return;
                      const next = rows.map((r) => [...r]);
                      next[ri][ci] = (e.currentTarget.textContent || "").trim();
                      onChange(next);
                    }}
                  >
                    {cell}
                  </Cell>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TranslatorDocumentPlatform() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [pair, setPair] = useState<LangPair>("RUS→KAZ");
  const [fileName, setFileName] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [screen, setScreen] = useState<Screen>("workspace");
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    setGlossary(loadGlossary());
    ensureDemoMemory(pair);
  }, [pair]);

  const persistGlossary = useCallback((next: GlossaryEntry[]) => {
    setGlossary(next);
    saveGlossary(next);
  }, []);

  const stats = blockStats(blocks);
  const bandCounts = {
    exact: blocks.filter((b) => memoryPctFromBlock(b) >= 100).length,
    hybrid: blocks.filter((b) => {
      const pct = memoryPctFromBlock(b);
      return pct >= 75 && pct < 100;
    }).length,
    llm: blocks.filter((b) => memoryPctFromBlock(b) < 75).length,
  };
  const { approvedPct, reviewLeft } = {
    approvedPct: stats.approvedPct,
    reviewLeft: stats.review,
  };

  const updateBlock = useCallback((id: string, patch: Partial<EditableBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const toggleApprove = useCallback(
    (blockId: string) => {
      setBlocks((prev) => {
        const block = prev.find((b) => b.id === blockId);
        if (!block) return prev;
        const nextApproved = !block.approved;
        const patch: Partial<EditableBlock> = {
          approved: nextApproved,
          match: nextApproved
            ? block.match === "new"
              ? "manual"
              : block.match
            : block.match === "manual"
              ? "new"
              : block.match,
          confidence: nextApproved ? 100 : block.confidence,
          translationParts: nextApproved
            ? [{ text: block.translation, from: "memory" }]
            : block.translationParts,
        };
        const next = prev.map((b) => (b.id === blockId ? { ...b, ...patch } : b));
        if (nextApproved) rememberApprovedSegments(next, pair);
        return next;
      });
    },
    [pair]
  );

  const focusTranslation = useCallback((blockId: string) => {
    setActiveId(blockId);
    // wait for hybrid highlight view → contentEditable mount
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-edit-id="${blockId}"]`
        ) as HTMLElement | null;
        if (!el) return;
        if (el.isContentEditable) {
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      });
    });
  }, []);

  const stopTranslation = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsTranslating(false);
    setProgress(null);
    setBlocks((prev) => prev.map((b) => ({ ...b, translating: false })));
    toast({ title: "Перевод остановлен", description: "Можно править уже готовые абзацы" });
  };

  const runTranslation = async (sourceBlocks: EditableBlock[], langPair: LangPair) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;
    const meta = pairMeta(langPair);
    setIsTranslating(true);
    setProgress({ done: 0, total: sourceBlocks.length });
    const next = sourceBlocks.map((b) => ({ ...b }));

    try {
      for (let i = 0; i < next.length; i++) {
        if (signal.aborted) break;
        setBlocks((prev) =>
          prev.map((b, idx) =>
            idx === i ? { ...b, translating: true } : { ...b, translating: false }
          )
        );

        if (next[i].tag === "table" && next[i].tableRows?.length) {
          const translatedRows: string[][] = [];
          for (const row of next[i].tableRows!) {
            if (signal.aborted) break;
            const cells: string[] = [];
            for (const cell of row) {
              if (!cell.trim()) {
                cells.push("");
                continue;
              }
              const tmHit = lookupMemory(cell, langPair);
              if (tmHit) {
                cells.push(tmHit.translation);
              } else {
                const { text } = await translateSegmentRobust(
                  cell,
                  meta.from,
                  meta.to,
                  signal
                );
                cells.push(text);
              }
            }
            translatedRows.push(cells);
          }
          const translation = translatedRows.map((r) => r.join("\t")).join("\n");
          next[i] = applyDemoMemoryCase(
            { ...next[i], tableRowsTranslated: translatedRows },
            translation,
            i
          );
        } else {
          const tmHit = lookupMemory(next[i].source, langPair);
          let translation = "";
          if (tmHit) {
            translation = tmHit.translation;
          } else {
            const { text } = await translateSegmentRobust(
              next[i].source,
              meta.from,
              meta.to,
              signal
            );
            translation = text;
          }
          next[i] = applyDemoMemoryCase(next[i], translation, i);
        }

        setBlocks([...next]);
        setProgress({ done: i + 1, total: next.length });
      }

      if (signal.aborted) return;

      const exact = next.filter((b) => memoryPctFromBlock(b) >= 100).length;
      const hybrid = next.filter((b) => {
        const pct = memoryPctFromBlock(b);
        return pct >= 75 && pct < 100;
      }).length;
      const llm = next.filter((b) => memoryPctFromBlock(b) < 75).length;
      toast({
        title: "Документ переведён",
        description: `Memory 100% · ${exact} · 75–99% · ${hybrid} · <75% · ${llm}`,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast({
        title: "Ошибка перевода",
        description: err instanceof Error ? err.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsTranslating(false);
      setProgress(null);
      setBlocks((prev) => prev.map((b) => ({ ...b, translating: false })));
    }
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const docBlocks = await readDocumentBlocks(file);
      const glossaryEntries = loadGlossary();
      const editable: EditableBlock[] = docBlocks.map((b, i) => {
        const { match, confidence } = classifyMatch(b.source, i, glossaryEntries);
        return {
          ...b,
          translation: "",
          approved: false,
          match,
          confidence,
        };
      });
      setFileName(file.name);
      setBlocks(editable);
      setScreen("workspace");
      setViewMode("split");
      setActiveId(editable[0]?.id ?? null);
      toast({
        title: "Документ загружен",
        description: `${editable.length} абзацев. ${
          isTranslatorConfigured() ? "AI-перевод…" : "Перевод на казахский…"
        }`,
      });
      void runTranslation(editable, pair);
    } catch (err) {
      toast({
        title: "Не удалось прочитать файл",
        description: err instanceof Error ? err.message : "Ошибка",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const approveAll = () => {
    setBlocks((prev) => {
      const next = prev.map((b) => ({
        ...b,
        approved: true,
        match: b.match === "new" ? ("manual" as SegmentMatch) : b.match,
        confidence: 100,
        translationParts: b.translation
          ? [{ text: b.translation, from: "memory" as const }]
          : b.translationParts,
      }));
      rememberApprovedSegments(next, pair);
      return next;
    });
    toast({
      title: "Документ утверждён",
      description: "Абзацы сохранены в Memory для следующих файлов",
    });
  };

  const downloadText = () => {
    const body = blocks.map((b) => b.translation || b.source).join("\n\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `translated_${(fileName || "document").replace(/\.\w+$/, "")}.txt`;
    a.click();
  };

  const retranslateActive = async () => {
    if (!activeId) return;
    const meta = pairMeta(pair);
    const block = blocks.find((b) => b.id === activeId);
    if (!block) return;
    const idx = blocks.findIndex((b) => b.id === activeId);
    updateBlock(activeId, { translating: true });
    try {
      const tmHit = lookupMemory(block.source, pair);
      let translation = tmHit?.translation ?? "";
      if (!translation) {
        const { text } = await translateSegmentRobust(block.source, meta.from, meta.to);
        translation = text;
      }
      updateBlock(activeId, applyDemoMemoryCase(block, translation, idx));
    } catch {
      updateBlock(activeId, { translating: false });
    }
  };

  return (
    <div
      className="flex flex-col h-full min-h-0 rounded-xl border overflow-hidden"
      style={{ background: BRONZE.surface, borderColor: "#EDE6DC" }}
    >
      <header
        className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-white"
        style={{ borderColor: "#EDE6DC" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{ background: BRONZE.deep }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h1 className="text-sm font-semibold truncate" style={{ color: "#1E293B" }}>
            Переводчик 2.0
          </h1>
        </div>
        <nav className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 gap-1 text-xs px-2.5",
              screen === "workspace"
                ? "border-transparent text-white hover:opacity-90"
                : "bg-white"
            )}
            style={screen === "workspace" ? { background: BRONZE.deep } : undefined}
            onClick={() => setScreen("workspace")}
          >
            <FileText className="h-3 w-3" />
            Документ
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 gap-1 text-xs px-2.5",
              screen === "glossary"
                ? "border-transparent text-white hover:opacity-90"
                : "bg-white"
            )}
            style={screen === "glossary" ? { background: BRONZE.deep } : undefined}
            onClick={() => setScreen("glossary")}
          >
            <BookOpen className="h-3 w-3" />
            Глоссарий
          </Button>
        </nav>
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {screen === "glossary" ? (
          <GlossaryView entries={glossary} onChange={persistGlossary} />
        ) : blocks.length === 0 ? (
          <div className="max-w-3xl mx-auto space-y-5">
            <section
              className="bg-white rounded-xl border p-6 shadow-sm"
              style={{ borderColor: "#EDE6DC" }}
            >
              <h2 className="text-base font-semibold mb-1" style={{ color: "#1E293B" }}>
                Новый перевод документа
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Загрузите DOCX — увидите весь текст как документ, а не список блоков
              </p>

              <div
                className={cn(
                  "rounded-xl border-2 border-dashed px-6 py-10 transition-colors cursor-pointer mb-4",
                  dragOver ? "bg-[#F7F1E8]" : "bg-slate-50/80"
                )}
                style={{ borderColor: dragOver ? BRONZE.mid : "#D9CBB8" }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  void handleFile(e.dataTransfer.files?.[0] ?? null);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center"
                    style={{ background: BRONZE.bg, color: BRONZE.deep }}
                  >
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Upload className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {isUploading ? "Читаем структуру документа…" : "Перетащите файл или выберите"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">DOCX предпочтительно · также PDF, TXT</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.pdf,.txt,.md"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Направление</label>
                  <Select value={pair} onValueChange={(v) => setPair(v as LangPair)}>
                    <SelectTrigger className="bg-white h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAIR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="h-11 px-6 text-white"
                  style={{ background: BRONZE.deep }}
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Перевести документ
                </Button>
              </div>
            </section>

            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              {[
                { t: "Форматирование", d: "Заголовки и абзацы как в исходнике" },
                { t: "Правка на месте", d: "Клик по тексту — редактируйте сразу" },
                { t: "Цельный обзор", d: "Читайте отчёт целиком, не блоками" },
              ].map((item) => (
                <div
                  key={item.t}
                  className="bg-white rounded-lg border p-3"
                  style={{ borderColor: "#EDE6DC" }}
                >
                  <div className="font-medium text-slate-800 text-sm">{item.t}</div>
                  <div className="text-xs text-slate-500 mt-1">{item.d}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-[1400px] mx-auto space-y-3 w-full">
            {/* Compact toolbar */}
            <div
              className="bg-white rounded-xl border px-3 py-2.5 shadow-sm space-y-2"
              style={{ borderColor: "#EDE6DC" }}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: BRONZE.deep }} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "#1E293B" }}>
                      {fileName}
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>{pairMeta(pair).label}</span>
                      <span className="text-slate-300">·</span>
                      <span>{stats.total} абз.</span>
                      {progress ? (
                        <span>
                          перевод {progress.done}/{progress.total}
                        </span>
                      ) : (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>проверено {approvedPct}%</span>
                          <span className="text-slate-300">·</span>
                          <span>на проверке {reviewLeft}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <div
                    className="flex rounded-md border overflow-hidden h-7"
                    style={{ borderColor: "#EDE6DC" }}
                  >
                    <button
                      type="button"
                      className={cn(
                        "px-2.5 text-[11px] font-medium flex items-center gap-1",
                        viewMode === "split" ? "text-white" : "bg-white text-slate-600"
                      )}
                      style={viewMode === "split" ? { background: BRONZE.deep } : undefined}
                      onClick={() => setViewMode("split")}
                      title="Сверка — оригинал слева"
                    >
                      <Columns2 className="h-3 w-3" />
                      Сверка
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "px-2.5 text-[11px] font-medium flex items-center gap-1",
                        viewMode === "document" ? "text-white" : "bg-white text-slate-600"
                      )}
                      style={viewMode === "document" ? { background: BRONZE.deep } : undefined}
                      onClick={() => setViewMode("document")}
                      title="Документ — оригинал по наведению"
                    >
                      <Languages className="h-3 w-3" />
                      Документ
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={isTranslating}
                    title="Обновить перевод"
                    onClick={() => void runTranslation(blocks, pair)}
                  >
                    {isTranslating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  {isTranslating && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-[11px] px-2"
                      onClick={stopTranslation}
                    >
                      <Square className="h-3 w-3 mr-1 fill-current" />
                      Стоп
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    title="Скачать"
                    onClick={downloadText}
                    disabled={isTranslating}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-[11px] text-white px-2.5"
                    style={{ background: BRONZE.deep }}
                    onClick={approveAll}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Утвердить
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-slate-500 px-2"
                    onClick={() => {
                      abortRef.current?.abort();
                      setBlocks([]);
                      setFileName(null);
                      setIsTranslating(false);
                      setProgress(null);
                      setFocusedId(null);
                      setActiveId(null);
                    }}
                  >
                    Очистить
                  </Button>
                </div>
              </div>

              {/* Slim status strip */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] pt-1 border-t" style={{ borderColor: "#F1E9DE" }}>
                <span style={{ color: "#047857" }}>
                  Memory · {bandCounts.exact}
                </span>
                <span style={{ color: "#1D4ED8" }}>
                  Гибрид · {bandCounts.hybrid}
                </span>
                <span style={{ color: "#CA8A04" }}>
                  Новый · {bandCounts.llm}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">
                  ✓ {stats.approved}/{stats.total}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-400">
                  курсор в блоке: гибрид — зелёный Memory / синий AI · новый — слева только Memory · Enter — утвердить
                </span>
              </div>
            </div>

            {/* Progress */}
            {isTranslating && progress && (
              <div className="flex items-center gap-3">
                <div
                  className="h-1.5 flex-1 rounded-full overflow-hidden"
                  style={{ background: "#EDE6DC" }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${(progress.done / Math.max(progress.total, 1)) * 100}%`,
                      background: BRONZE.deep,
                    }}
                  />
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={stopTranslation}>
                  <Square className="h-3 w-3 mr-1 fill-current" />
                  Остановить
                </Button>
              </div>
            )}

            {/* Document paper */}
            <div
              className={cn(
                "bg-white rounded-xl border shadow-sm overflow-hidden",
                viewMode === "split" && "grid grid-cols-1 md:grid-cols-2"
              )}
              style={{ borderColor: "#EDE6DC" }}
            >
              {viewMode === "split" && (
                <div
                  className="border-b md:border-b-0 md:border-r p-6 md:p-8 min-w-0 w-full bg-white"
                  style={{ borderColor: "#EDE6DC" }}
                >
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-6 font-medium">
                    Оригинал · только чтение
                  </div>
                  <article className="max-w-none font-sans" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                    {blocks.map((block) => {
                      const isActive = activeId === block.id;
                      const memoryPct = memoryPctFromBlock(block);
                      const band = memoryBandFromBlock(block);
                      const isFocused = focusedId === block.id;
                      const showHybridSource = isFocused && band === "hybrid";
                      const showNewSourceMemory = isFocused && band === "llm";

                      if (block.tag === "table" && block.tableRows) {
                        return (
                          <div
                            key={`src-${block.id}`}
                            id={`src-${block.id}`}
                            className="rounded-lg -mx-2 px-2 py-1 mb-2 cursor-pointer bg-white"
                            style={blockActiveStyle(isActive)}
                            onClick={() => {
                              document.getElementById(`trg-${block.id}`)?.scrollIntoView({
                                behavior: "smooth",
                                block: "nearest",
                              });
                              focusTranslation(block.id);
                            }}
                          >
                            <div className="flex justify-end mb-1">
                              <MatchBadge memoryPct={memoryPct} band={band} />
                            </div>
                            <DocTable rows={block.tableRows} />
                          </div>
                        );
                      }

                      const Tag = block.tag === "li" ? "li" : block.tag === "table" ? "div" : block.tag;
                      return (
                        <div
                          key={`src-${block.id}`}
                          className="rounded-lg -mx-2 px-2 py-1 mb-1 cursor-pointer bg-white"
                          style={blockActiveStyle(isActive)}
                          onClick={() => {
                            document.getElementById(`trg-${block.id}`)?.scrollIntoView({
                              behavior: "smooth",
                              block: "nearest",
                            });
                            focusTranslation(block.id);
                          }}
                        >
                          <div className="flex justify-end mb-0.5">
                            <MatchBadge memoryPct={memoryPct} band={band} />
                          </div>
                          <Tag
                            id={`src-${block.id}`}
                            className={cn(blockClass(block.tag), "rounded-md px-1 -mx-1")}
                            style={{ color: headingColor(block.tag) || "#1E293B" }}
                          >
                            {showHybridSource
                              ? highlightSourceText(block.source, block.sourceMemorySpans)
                              : showNewSourceMemory
                                ? highlightSourceMemoryOnly(block.source, block.sourceMemorySpans)
                                : block.source}
                          </Tag>
                        </div>
                      );
                    })}
                  </article>
                </div>
              )}

              <div className="p-6 md:p-8 relative min-w-0 w-full bg-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                    {viewMode === "split"
                      ? "Перевод · редактор (сверка)"
                      : "Перевод · редактор (документ)"}
                  </div>
                  {activeId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => void retranslateActive()}
                    >
                      Перевести абзац заново
                    </Button>
                  )}
                </div>

                <article
                  className="max-w-none min-h-[480px] font-sans"
                  style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
                >
                  {blocks.map((block) => {
                    const isActive = activeId === block.id;
                    const memoryPct = memoryPctFromBlock(block);
                    const band = memoryBandFromBlock(block);

                    if (block.tag === "table") {
                      const rows =
                        block.tableRowsTranslated ||
                        block.tableRows ||
                        (block.translation
                          ? block.translation.split("\n").map((l) => l.split("\t"))
                          : []);
                      return (
                        <div
                          key={block.id}
                          id={`trg-${block.id}`}
                          className="group relative -mx-2 px-2 py-1 mb-2 rounded-lg cursor-pointer bg-white"
                          style={blockActiveStyle(isActive)}
                          onClick={() => {
                            setActiveId(block.id);
                            if (viewMode === "split") {
                              document.getElementById(`src-${block.id}`)?.scrollIntoView({
                                behavior: "smooth",
                                block: "nearest",
                              });
                            }
                          }}
                        >
                          <div className="flex items-center justify-end gap-2 mb-1">
                            <MatchBadge memoryPct={memoryPct} band={band} />
                            <button
                              type="button"
                              title="Утвердить (Enter)"
                              className={cn(
                                "h-5 w-5 rounded-full flex items-center justify-center",
                                block.approved ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                              )}
                              style={{
                                background: block.approved ? "#16A34A" : BRONZE.bg,
                                color: block.approved ? "white" : BRONZE.deep,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleApprove(block.id);
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          </div>
                          {block.translating ? (
                            <div className="text-sm text-slate-400 py-4">Переводим таблицу…</div>
                          ) : (
                            <DocTable
                              rows={rows}
                              editable={!isTranslating}
                              onChange={(nextRows) =>
                                updateBlock(block.id, {
                                  tableRowsTranslated: nextRows,
                                  translation: nextRows.map((r) => r.join("\t")).join("\n"),
                                  approved: false,
                                })
                              }
                            />
                          )}
                        </div>
                      );
                    }

                    const Tag = block.tag === "li" ? "div" : block.tag;
                    const isFocused = focusedId === block.id;
                    const showHybridSource = isFocused && band === "hybrid";
                    const showNewSourceMemory = isFocused && band === "llm";
                    return (
                      <div
                        key={block.id}
                        id={`trg-${block.id}`}
                        className="group relative rounded-lg -mx-2 px-2 py-1 mb-1 cursor-pointer bg-white"
                        style={blockActiveStyle(isActive)}
                        onClick={() => {
                          setActiveId(block.id);
                          if (viewMode === "split") {
                            document.getElementById(`src-${block.id}`)?.scrollIntoView({
                              behavior: "smooth",
                              block: "nearest",
                            });
                          }
                        }}
                      >
                        {viewMode === "document" && (
                          <div
                            className="pointer-events-none absolute left-0 right-0 bottom-full z-20 mb-1.5 hidden group-hover:block"
                            role="tooltip"
                          >
                            <div
                              className="rounded-lg border px-3 py-2 shadow-md text-[12px] leading-snug text-slate-700 max-h-36 overflow-auto bg-white"
                              style={{
                                borderColor: "#E5D5C0",
                                boxShadow: "0 8px 24px rgba(30,41,59,0.12)",
                              }}
                            >
                              <div
                                className="text-[9px] uppercase tracking-wider mb-1 font-medium"
                                style={{ color: BRONZE.deep }}
                              >
                                Оригинал
                              </div>
                              {showHybridSource
                                ? highlightSourceText(block.source, block.sourceMemorySpans)
                                : showNewSourceMemory
                                  ? highlightSourceMemoryOnly(block.source, block.sourceMemorySpans)
                                  : block.source}
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-2">
                          <HybridBlockEditor
                            block={block}
                            tag={Tag}
                            isTranslating={isTranslating}
                            showMarks={isFocused && band === "hybrid"}
                            blockClassName={blockClass(block.tag)}
                            headingColor={headingColor(block.tag)}
                            onFocus={() => {
                              setActiveId(block.id);
                              setFocusedId(block.id);
                            }}
                            onBlur={(text) => {
                              setFocusedId((id) => (id === block.id ? null : id));
                              if (text !== block.translation) {
                                const memoryPhrases = block.sourceMemorySpans?.length
                                  ? block.sourceMemorySpans
                                  : loadGlossary()
                                      .filter((g) => block.source.includes(g.source))
                                      .map((g) => g.translation);
                                const parts =
                                  band === "hybrid"
                                    ? splitByPhrases(text, memoryPhrases)
                                    : band === "exact"
                                      ? [{ text, from: "memory" as const }]
                                      : [{ text, from: "llm" as const }];
                                const nextPct = memoryPctFromParts(parts, text);
                                updateBlock(block.id, {
                                  translation: text,
                                  approved: false,
                                  translationParts: parts,
                                  confidence: nextPct,
                                });
                              }
                            }}
                            onKeyDown={(e: KeyboardEvent) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                e.stopPropagation();
                                (e.currentTarget as HTMLElement).blur();
                                if (!block.approved) toggleApprove(block.id);
                              }
                            }}
                          />
                          <div className="flex items-center gap-1.5 shrink-0 pt-1 self-end">
                            <MatchBadge memoryPct={memoryPct} band={band} />
                            <button
                              type="button"
                              title="Утвердить · Enter"
                              className={cn(
                                "h-5 w-5 rounded-full flex items-center justify-center transition-opacity",
                                block.approved ? "opacity-100" : "opacity-50 group-hover:opacity-100"
                              )}
                              style={{
                                background: block.approved ? "#16A34A" : BRONZE.bg,
                                color: block.approved ? "white" : BRONZE.deep,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleApprove(block.id);
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </article>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
