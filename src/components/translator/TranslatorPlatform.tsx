import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Languages,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { readDocumentForTranslation } from "@/services/translator/document-import";
import {
  isTranslatorConfigured,
  localFallbackTranslate,
  translateSegmentRobust,
  type TranslatorLanguage,
} from "@/services/translator/translator.service";
import type {
  GlossaryEntry,
  LangPair,
  SegmentMatch,
  TranslationOrigin,
  TranslationSegment,
  TranslationTask,
  TranslatorView,
} from "./types";
import {
  loadGlossary,
  loadTasks,
  saveGlossary,
  saveTasks,
  splitIntoSegments,
} from "./translator-storage";
import { GlossaryView } from "./GlossaryView";
import { OriginBadge, OriginMetricChips } from "./OriginBadge";
import {
  ensureDemoMemory,
  lookupMemory,
  originFromEngine,
  originStats,
  rememberApprovedSegments,
  syncMemoryFromTasks,
} from "./translation-memory";

/** Самрук фирменный бронзовый (#A17436) — как primary в AI-HUB */
const BRONZE = {
  deep: "#A17436",
  mid: "#B8924F",
  light: "#D4B483",
  bg: "#F7F1E8",
  surface: "#FBF8F4",
};

const PAIR_OPTIONS: { value: LangPair; label: string; from: TranslatorLanguage; to: TranslatorLanguage }[] = [
  { value: "RUS→KAZ", label: "Русский → Казахский", from: "RUS", to: "KAZ" },
  { value: "KAZ→RUS", label: "Казахский → Русский", from: "KAZ", to: "RUS" },
  { value: "RUS→ENG", label: "Русский → Английский", from: "RUS", to: "ENG" },
  { value: "ENG→RUS", label: "Английский → Русский", from: "ENG", to: "RUS" },
];

function pairMeta(pair: LangPair) {
  return PAIR_OPTIONS.find((p) => p.value === pair) ?? PAIR_OPTIONS[0];
}

function newId() {
  return crypto.randomUUID();
}

function statusLabel(status: TranslationTask["status"]) {
  if (status === "processing") return { title: "В обработке", sub: "Перевод выполняется" };
  if (status === "approved") return { title: "Утверждено", sub: "Документ утверждён" };
  return { title: "Завершено", sub: "Перевод завершён" };
}

function matchLabel(match: SegmentMatch, confidence: number) {
  if (match === "exact") return `Точное совпадение · ${confidence}%`;
  if (match === "fuzzy") return `Похожие · ${confidence}%`;
  if (match === "manual") return `Проверено вручную · ${confidence}%`;
  return `Новый · ${confidence}%`;
}

function segmentStats(segments: TranslationSegment[]) {
  return {
    total: segments.length,
    exact: segments.filter((s) => s.match === "exact").length,
    fuzzy: segments.filter((s) => s.match === "fuzzy").length,
    neu: segments.filter((s) => s.match === "new").length,
    review: segments.filter((s) => !s.approved).length,
  };
}

function buildSegmentsFromText(text: string, _pair: LangPair): TranslationSegment[] {
  const chunks = splitIntoSegments(text);
  return chunks.map((source, i) => {
    const glossaryHit = loadGlossary().some((g) => source.includes(g.source));
    const match: SegmentMatch = glossaryHit ? "exact" : i % 7 === 0 ? "new" : "fuzzy";
    const confidence = match === "new" ? 0 : match === "exact" ? 100 : 60;
    return {
      id: newId(),
      index: i,
      source,
      translation: "", // заполняется асинхронным переводом
      match,
      confidence,
      approved: false,
      kind: "Normal",
    };
  });
}

export function TranslatorPlatform() {
  const { toast } = useToast();
  const [view, setView] = useState<TranslatorView>("tasks");
  const [tasks, setTasks] = useState<TranslationTask[]>([]);
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [pair, setPair] = useState<LangPair>("RUS→KAZ");
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tasks = loadTasks();
    setTasks(tasks);
    setGlossary(loadGlossary());
    ensureDemoMemory("RUS→KAZ");
    syncMemoryFromTasks(tasks);
  }, []);

  const persistTasks = useCallback((next: TranslationTask[]) => {
    setTasks(next);
    saveTasks(next);
  }, []);

  const persistGlossary = useCallback((next: GlossaryEntry[]) => {
    setGlossary(next);
    saveGlossary(next);
  }, []);

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeTaskId) ?? null,
    [tasks, activeTaskId]
  );

  const openEditor = (taskId: string) => {
    setActiveTaskId(taskId);
    setView("editor");
  };

  const updateActiveTask = (updater: (task: TranslationTask) => TranslationTask) => {
    if (!activeTaskId) return;
    persistTasks(tasks.map((t) => (t.id === activeTaskId ? updater(t) : t)));
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const text = await readDocumentForTranslation(file);
      const taskId = newId();
      const segments = buildSegmentsFromText(text, pair);
      const engineHint = isTranslatorConfigured()
        ? "Запускаем AI-перевод на казахский…"
        : "Запускаем перевод на казахский (MyMemory / локальный fallback)…";

      const task: TranslationTask = {
        id: taskId,
        fileName: file.name,
        pair,
        status: "processing",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        segments,
      };

      persistTasks([task, ...tasks]);
      openEditor(taskId);

      toast({
        title: "Документ загружен",
        description: `${segments.length} фрагментов. ${engineHint}`,
      });

      void runTranslation(taskId, segments, pair);
    } catch (err) {
      toast({
        title: "Не удалось прочитать файл",
        description: err instanceof Error ? err.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const runTranslation = async (
    taskId: string,
    segments: TranslationSegment[],
    langPair: LangPair
  ) => {
    const meta = pairMeta(langPair);
    const next = [...segments];
    try {
      for (let i = 0; i < next.length; i++) {
        const tmHit = lookupMemory(next[i].source, langPair);
        let translated: string;
        let origin: TranslationOrigin;
        let match: SegmentMatch;
        let confidence: number;

        if (tmHit) {
          translated = tmHit.translation;
          origin = "memory";
          match = "exact";
          confidence = 100;
        } else {
          const { text, engine } = await translateSegmentRobust(
            next[i].source,
            meta.from,
            meta.to
          );
          translated = text;
          origin = originFromEngine(engine);
          match = origin === "llm" ? "new" : "fuzzy";
          confidence = origin === "llm" ? 70 : origin === "online" ? 80 : 55;
        }
        next[i] = {
          ...next[i],
          translation: translated,
          origin,
          match,
          confidence,
        };
        const current = loadTasks();
        saveTasks(
          current.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  segments: [...next],
                  status: i === next.length - 1 ? "completed" : "processing",
                  updatedAt: new Date().toISOString(),
                }
              : t
          )
        );
        setTasks(loadTasks());
      }
      const origins = originStats(next);
      toast({
        title: "Перевод завершён",
        description: `Memory ${origins.memory} · LLM ${origins.llm} · прочее ${origins.other}`,
      });
    } catch (err) {
      const current = loadTasks();
      saveTasks(
        current.map((t) =>
          t.id === taskId
            ? {
                ...t,
                segments: next.map((s) =>
                  s.translation
                    ? s
                    : {
                        ...s,
                        translation: localFallbackTranslate(s.source, meta.from, meta.to),
                        match: "fuzzy" as SegmentMatch,
                        confidence: 50,
                        origin: "local" as TranslationOrigin,
                      }
                ),
                status: "completed",
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
      setTasks(loadTasks());
      toast({
        title: "Частичный перевод",
        description: err instanceof Error ? err.message : "Использован запасной перевод",
        variant: "destructive",
      });
    }
  };

  const deleteTask = (id: string) => {
    persistTasks(tasks.filter((t) => t.id !== id));
    if (activeTaskId === id) {
      setActiveTaskId(null);
      setView("tasks");
    }
  };

  return (
    <div
      className="flex flex-col h-full min-h-0 rounded-xl border overflow-hidden"
      style={{ background: BRONZE.surface, borderColor: "#EDE6DC" }}
    >
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b bg-white"
        style={{ borderColor: "#EDE6DC" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={{ background: BRONZE.deep }}
          >
            <Languages className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight" style={{ color: "#1E293B" }}>
              Платформа перевода документов
            </h1>
            <p className="text-[11px] text-slate-500">Агент «Переводчик»</p>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-1.5",
              view === "tasks" || view === "editor"
                ? "border-transparent text-white hover:opacity-90"
                : "bg-white"
            )}
            style={
              view === "tasks" || view === "editor"
                ? { background: BRONZE.deep }
                : undefined
            }
            onClick={() => setView("tasks")}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Задачи
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-1.5",
              view === "glossary"
                ? "border-transparent text-white hover:opacity-90"
                : "bg-white"
            )}
            style={view === "glossary" ? { background: BRONZE.deep } : undefined}
            onClick={() => setView("glossary")}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Глоссарий
          </Button>
        </nav>
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-5">
        {view === "tasks" && (
          <TasksView
            tasks={tasks}
            pair={pair}
            setPair={setPair}
            isUploading={isUploading}
            dragOver={dragOver}
            setDragOver={setDragOver}
            fileInputRef={fileInputRef}
            onFile={handleFile}
            onOpen={openEditor}
            onDelete={deleteTask}
          />
        )}
        {view === "glossary" && (
          <GlossaryView entries={glossary} onChange={persistGlossary} />
        )}
        {view === "editor" && activeTask && (
          <EditorView
            task={activeTask}
            onBack={() => setView("tasks")}
            onChange={updateActiveTask}
            onRefresh={() => {
              updateActiveTask((t) => ({
                ...t,
                status: "processing",
                segments: t.segments.map((s) => ({ ...s, translation: "", approved: false })),
              }));
              toast({ title: "Обновление", description: "Переводим сегменты на казахский…" });
              const refreshed = {
                ...activeTask,
                segments: activeTask.segments.map((s) => ({ ...s, translation: "", approved: false })),
              };
              void runTranslation(activeTask.id, refreshed.segments, activeTask.pair);
            }}
          />
        )}
        {view === "editor" && !activeTask && (
          <div className="text-sm text-slate-500">Задача не найдена. Вернитесь к списку задач.</div>
        )}
      </div>
    </div>
  );
}

function TasksView({
  tasks,
  pair,
  setPair,
  isUploading,
  dragOver,
  setDragOver,
  fileInputRef,
  onFile,
  onOpen,
  onDelete,
}: {
  tasks: TranslationTask[];
  pair: LangPair;
  setPair: (p: LangPair) => void;
  isUploading: boolean;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | null) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <section className="bg-white rounded-xl border p-5 shadow-sm" style={{ borderColor: "#EDE6DC" }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: "#1E293B" }}>
          Новый перевод
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_auto] gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Документ</label>
            <div
              className={cn(
                "rounded-xl border-2 border-dashed px-4 py-6 transition-colors cursor-pointer",
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
                onFile(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ background: BRONZE.bg, color: BRONZE.deep }}
                >
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {isUploading ? "Читаем документ…" : "Перетащите файл или нажмите для выбора"}
                  </p>
                  <p className="text-xs text-slate-500">DOCX, PDF, TXT, Markdown</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf,.txt,.md,.markdown"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Перевод</label>
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
            Перевести
          </Button>
        </div>
      </section>

      <section className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: "#EDE6DC" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "#EDE6DC" }}>
          <h2 className="text-base font-semibold" style={{ color: "#1E293B" }}>
            История переводов
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Загруженные документы и текущий статус обработки</p>
        </div>

        {tasks.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            Пока нет задач. Загрузите документ, чтобы начать.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b" style={{ borderColor: "#EDE6DC" }}>
                  <th className="text-left font-medium px-5 py-3">Файл</th>
                  <th className="text-left font-medium px-5 py-3">Перевод</th>
                  <th className="text-left font-medium px-5 py-3">Статус</th>
                  <th className="text-right font-medium px-5 py-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const st = statusLabel(task.status);
                  return (
                    <tr key={task.id} className="border-b last:border-0 hover:bg-slate-50/70" style={{ borderColor: "#F1F5F9" }}>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800 truncate max-w-[280px]">{task.fileName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {task.segments.length} фрагм. · {new Date(task.updatedAt).toLocaleString("ru-RU")}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{pairMeta(task.pair).label}</td>
                      <td className="px-5 py-3.5">
                        <Badge
                          className="border-0 text-xs"
                          style={{
                            background: task.status === "approved" ? "#DCFCE7" : task.status === "processing" ? BRONZE.bg : "#F0E6D6",
                            color: task.status === "approved" ? "#166534" : BRONZE.deep,
                          }}
                        >
                          {st.title}
                        </Badge>
                        <div className="text-[11px] text-slate-400 mt-1">{st.sub}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="outline" size="icon" className="h-8 w-8" title="Открыть" onClick={() => onOpen(task.id)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            title="Скачать перевод"
                            onClick={() => {
                              const blob = new Blob(
                                [task.segments.map((s) => s.translation).join("\n\n")],
                                { type: "text/plain;charset=utf-8" }
                              );
                              const a = document.createElement("a");
                              a.href = URL.createObjectURL(blob);
                              a.download = `translated_${task.fileName.replace(/\.\w+$/, "")}.txt`;
                              a.click();
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            title="Удалить"
                            onClick={() => onDelete(task.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function EditorView({
  task,
  onBack,
  onChange,
  onRefresh,
}: {
  task: TranslationTask;
  onBack: () => void;
  onChange: (updater: (task: TranslationTask) => TranslationTask) => void;
  onRefresh: () => void;
}) {
  const stats = segmentStats(task.segments);
  const [filter, setFilter] = useState<"all" | "exact" | "fuzzy" | "new" | "review">("all");
  const [activeId, setActiveId] = useState<string | null>(task.segments[0]?.id ?? null);

  const visible = task.segments.filter((s) => {
    if (filter === "all") return true;
    if (filter === "exact") return s.match === "exact";
    if (filter === "fuzzy") return s.match === "fuzzy";
    if (filter === "new") return s.match === "new";
    return !s.approved;
  });

  const origins = originStats(task.segments);

  const setSegment = (id: string, patch: Partial<TranslationSegment>) => {
    onChange((t) => {
      const segments = t.segments.map((s) => (s.id === id ? { ...s, ...patch } : s));
      if (patch.approved) {
        rememberApprovedSegments(segments, t.pair);
      }
      return {
        ...t,
        segments,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const approveAll = () => {
    onChange((t) => {
      const segments = t.segments.map((s) => ({
        ...s,
        approved: true,
        match: s.match === "new" ? ("manual" as SegmentMatch) : s.match,
        confidence: 100,
      }));
      rememberApprovedSegments(segments, t.pair);
      return {
        ...t,
        status: "approved" as const,
        segments,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0);
  const approvedCount = task.segments.filter((s) => s.approved).length;
  const approvedPct = pct(approvedCount);

  const chips = [
    { key: "all" as const, label: "Всего", value: stats.total, sub: undefined as string | undefined },
    { key: "exact" as const, label: "Точные", value: stats.exact, sub: `${pct(stats.exact)}%` },
    { key: "fuzzy" as const, label: "Похожие", value: stats.fuzzy, sub: `${pct(stats.fuzzy)}%` },
    { key: "new" as const, label: "Новые", value: stats.neu, sub: `${pct(stats.neu)}%` },
    { key: "review" as const, label: "На проверке", value: stats.review, sub: `${pct(stats.review)}%` },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="bg-white rounded-xl border p-4 shadow-sm flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "#EDE6DC" }}>
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500" onClick={onBack}>
            ← Задачи
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0" style={{ color: BRONZE.deep }} />
              <h2 className="text-sm font-semibold truncate" style={{ color: "#1E293B" }}>
                {task.fileName}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {pairMeta(task.pair).label} · {task.segments.length} фрагментов · проверено {approvedPct}%
              {" · "}
              <span style={{ color: "#047857" }}>Memory {origins.memoryPct}%</span>
              {" · "}
              <span style={{ color: "#1D4ED8" }}>LLM {origins.llmPct}%</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Обновить
          </Button>
          <Button size="sm" className="h-8 text-white" style={{ background: BRONZE.deep }} onClick={approveAll}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Утвердить все
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <OriginMetricChips
          memory={origins.memory}
          llm={origins.llm}
          memoryPct={origins.memoryPct}
          llmPct={origins.llmPct}
        />
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setFilter(chip.key)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left min-w-[100px] transition-colors bg-white",
              filter === chip.key ? "shadow-sm" : "hover:bg-slate-50"
            )}
            style={{
              borderColor: filter === chip.key ? BRONZE.mid : "#EDE6DC",
              background: filter === chip.key ? BRONZE.bg : "white",
            }}
          >
            <div className="text-[10px] uppercase tracking-wide text-slate-400">{chip.label}</div>
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-lg font-semibold"
                style={{ color: filter === chip.key ? BRONZE.deep : "#1E293B" }}
              >
                {chip.value}
              </span>
              {chip.sub && (
                <span className="text-xs font-medium" style={{ color: BRONZE.deep }}>
                  {chip.sub}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <section className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: "#EDE6DC" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#EDE6DC", background: BRONZE.bg }}>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: BRONZE.deep }}>
              Структура документа
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {visible.length} из {task.segments.length} фрагментов в исходном порядке
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-[11px] uppercase tracking-wide text-slate-400 font-medium hidden sm:grid">
            <span>Оригинал</span>
            <span>Перевод</span>
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
          {visible.map((seg) => {
            const isActive = activeId === seg.id;
            return (
              <div
                key={seg.id}
                className={cn("grid grid-cols-1 md:grid-cols-2 gap-3 p-4 transition-colors", isActive && "bg-[#FBF7F0]")}
                onClick={() => setActiveId(seg.id)}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        background: seg.approved
                          ? "#22C55E"
                          : seg.origin === "memory"
                            ? "#059669"
                            : seg.origin === "llm"
                              ? "#2563EB"
                              : seg.match === "new"
                                ? "#94A3B8"
                                : BRONZE.mid,
                      }}
                    />
                    <span className="text-[11px] text-slate-400">#{seg.index}</span>
                    <OriginBadge origin={seg.origin} />
                    <Badge variant="outline" className="text-[10px] h-5 font-normal">
                      {seg.kind ?? "Normal"}
                    </Badge>
                    <span className="text-[11px] text-slate-500">{matchLabel(seg.match, seg.confidence)}</span>
                  </div>
                  <div
                    className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap rounded-lg border bg-slate-50/80 p-3"
                    style={{
                      borderColor:
                        seg.origin === "memory"
                          ? "#A7F3D0"
                          : seg.origin === "llm"
                            ? "#BFDBFE"
                            : "#EDE6DC",
                      background:
                        seg.origin === "memory"
                          ? "#F0FDF4"
                          : seg.origin === "llm"
                            ? "#F8FAFF"
                            : undefined,
                    }}
                  >
                    {seg.source}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 min-h-[20px]">
                    <div className="flex items-center gap-2">
                      {seg.approved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <Check className="h-3 w-3" /> Проверено
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Редактируйте перевод</span>
                      )}
                      <OriginBadge origin={seg.origin} />
                    </div>
                  </div>
                  <div className="relative">
                    <Textarea
                      value={seg.translation}
                      onChange={(e) => setSegment(seg.id, { translation: e.target.value, approved: false })}
                      onFocus={() => setActiveId(seg.id)}
                      className={cn(
                        "min-h-[88px] text-sm leading-relaxed resize-y pr-10",
                        isActive && "ring-2"
                      )}
                      style={
                        {
                          borderColor: seg.origin === "memory" ? "#6EE7B7" : seg.origin === "llm" ? "#93C5FD" : isActive ? BRONZE.mid : undefined,
                          background: seg.origin === "memory" ? "#F0FDF488" : seg.origin === "llm" ? "#EFF6FF88" : undefined,
                          boxShadow: isActive ? `0 0 0 2px ${BRONZE.light}55` : undefined,
                        } as React.CSSProperties
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute bottom-2 right-2 h-7 w-7"
                      style={{ color: seg.approved ? "#16A34A" : BRONZE.deep }}
                      title="Проверить сегмент"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSegment(seg.id, {
                          approved: true,
                          match: "manual",
                          confidence: 100,
                        });
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {visible.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">Нет фрагментов в этом фильтре</div>
          )}
        </div>
      </section>
    </div>
  );
}

