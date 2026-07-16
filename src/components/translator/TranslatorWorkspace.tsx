import { useCallback, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Download,
  FileUp,
  Languages,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Modal } from "@/shared/components/Modal";
import { FileUpload } from "@/shared/components/Forms/FileUpload";
import { useToast } from "@/shared/components/Toast";
import { cn } from "@/lib/utils";
import { readDocumentForTranslation } from "@/services/translator/document-import";
import {
  downloadTranslation,
  getTranslatorProviderSummary,
  isTranslatorConfigured,
  translateText,
  type TranslatorLanguage,
} from "@/services/translator/translator.service";

const LANGUAGES: { value: TranslatorLanguage; label: string }[] = [
  { value: "RUS", label: "Русский" },
  { value: "KAZ", label: "Казахский" },
  { value: "ENG", label: "Английский" },
];

function EditorPanel({
  title,
  subtitle,
  value,
  onChange,
  placeholder,
  readOnly,
  panelRef,
  onScroll,
}: {
  title: string;
  subtitle: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder: string;
  readOnly?: boolean;
  panelRef?: React.RefObject<HTMLTextAreaElement | null>;
  onScroll?: () => void;
}) {
  return (
    <Card className="flex flex-col h-full min-h-0 border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
      <CardHeader className="flex-shrink-0 py-3 px-4 border-b border-border/40 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Badge variant="outline" className="text-xs font-normal">
            {subtitle}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <textarea
          ref={panelRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onScroll={onScroll}
          readOnly={readOnly}
          placeholder={placeholder}
          className={cn(
            "w-full h-full min-h-[320px] resize-none border-0 bg-transparent px-4 py-3 text-sm leading-relaxed",
            "focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60",
            readOnly && "cursor-default"
          )}
          spellCheck
        />
      </CardContent>
    </Card>
  );
}

export function TranslatorWorkspace() {
  const { showToast } = useToast();
  const providerSummary = getTranslatorProviderSummary();
  const isConfigured = isTranslatorConfigured();
  const [sourceLang, setSourceLang] = useState<TranslatorLanguage>("RUS");
  const [targetLang, setTargetLang] = useState<TranslatorLanguage>("KAZ");
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);

  const originalRef = useRef<HTMLTextAreaElement>(null);
  const translatedRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isSyncingScroll = useRef(false);

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setOriginalText(translatedText);
    setTranslatedText(originalText);
  };

  const handleImportFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setIsImporting(true);
    setIsImportModalOpen(false);

    try {
      const text = await readDocumentForTranslation(file);
      setOriginalText(text);
      setTranslatedText("");
      setSourceFileName(file.name);
      showToast(`Документ «${file.name}» загружен`, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось импортировать файл";
      showToast(message, "error");
    } finally {
      setIsImporting(false);
    }
  };

  const runTranslation = useCallback(async () => {
    if (!originalText.trim()) {
      showToast("Добавьте текст в поле «Оригинал»", "error");
      return;
    }

    if (sourceLang === targetLang) {
      showToast("Выберите разные языки для перевода", "error");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsTranslating(true);
    setTranslationProgress(null);

    try {
      const result = await translateText(
        originalText,
        sourceLang,
        targetLang,
        controller.signal,
        (completed, total) => {
          if (total > 1) {
            setTranslationProgress(`Фрагмент ${completed} из ${total}`);
          }
        }
      );
      setTranslatedText(result);
      showToast("Перевод выполнен", "success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        showToast("Перевод отменён", "info");
        return;
      }
      const message =
        error instanceof Error ? error.message : "Ошибка при переводе";
      showToast(message, "error");
    } finally {
      setIsTranslating(false);
      setTranslationProgress(null);
      abortRef.current = null;
    }
  }, [originalText, sourceLang, targetLang, showToast]);

  const handleClear = () => {
    abortRef.current?.abort();
    setOriginalText("");
    setTranslatedText("");
    setSourceFileName(null);
  };

  const handleExport = () => {
    if (!translatedText.trim()) {
      showToast("Нет текста для экспорта", "error");
      return;
    }

    const baseName = sourceFileName
      ? sourceFileName.replace(/\.[^.]+$/, "")
      : "document";
    const langSuffix = targetLang.toLowerCase();
    downloadTranslation(translatedText, `${baseName}_${langSuffix}.txt`);
    showToast("Файл скачан", "success");
  };

  const handleOriginalScroll = () => {
    if (!syncScroll || !originalRef.current || !translatedRef.current) return;
    if (isSyncingScroll.current) return;

    const source = originalRef.current;
    const target = translatedRef.current;
    const ratio =
      source.scrollTop / Math.max(source.scrollHeight - source.clientHeight, 1);

    isSyncingScroll.current = true;
    target.scrollTop = ratio * Math.max(target.scrollHeight - target.clientHeight, 1);
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleTranslatedScroll = () => {
    if (!syncScroll || !originalRef.current || !translatedRef.current) return;
    if (isSyncingScroll.current) return;

    const source = translatedRef.current;
    const target = originalRef.current;
    const ratio =
      source.scrollTop / Math.max(source.scrollHeight - source.clientHeight, 1);

    isSyncingScroll.current = true;
    target.scrollTop = ratio * Math.max(target.scrollHeight - target.clientHeight, 1);
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {!isConfigured ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm text-amber-950 dark:text-amber-50 space-y-3">
          <p className="font-medium">Чтобы переводчик заработал, нужен API-ключ (бесплатный вариант — Groq):</p>
          <ol className="list-decimal list-inside space-y-1.5 text-amber-900/90 dark:text-amber-100/90">
            <li>
              Получите ключ на{" "}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="underline font-medium"
              >
                console.groq.com/keys
              </a>
            </li>
            <li>
              Скопируйте <code className="rounded bg-background/60 px-1 py-0.5 text-xs">.env.example</code>{" "}
              → <code className="rounded bg-background/60 px-1 py-0.5 text-xs">.env</code> в корне проекта
            </li>
            <li>Вставьте ключ в <code className="rounded bg-background/60 px-1 py-0.5 text-xs">VITE_OPENAI_API_KEY</code></li>
            <li>Перезапустите <code className="rounded bg-background/60 px-1 py-0.5 text-xs">npm run dev</code></li>
          </ol>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-900 dark:text-emerald-100 flex items-center justify-between gap-2">
          <span>
            AI подключён: <strong>{providerSummary.label}</strong> · модель{" "}
            <strong>{providerSummary.model}</strong>
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Переводчик</h2>
            <p className="text-xs text-muted-foreground">
              Два листа на одном экране: оригинал и перевод с редактированием
            </p>
          </div>
          {sourceFileName && (
            <Badge variant="secondary" className="ml-auto max-w-[200px] truncate">
              {sourceFileName}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={sourceLang}
            onValueChange={(v) => setSourceLang(v as TranslatorLanguage)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handleSwapLanguages}
            title="Поменять языки и тексты"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>

          <Select
            value={targetLang}
            onValueChange={(v) => setTargetLang(v as TranslatorLanguage)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4 mr-2" />
            )}
            Импорт
          </Button>

          <Button size="sm" onClick={runTranslation} disabled={isTranslating || !isConfigured}>
            {isTranslating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Languages className="h-4 w-4 mr-2" />
            )}
            {translationProgress ?? "Перевести"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={runTranslation}
            disabled={isTranslating || !originalText.trim()}
            title="Обновить перевод по текущему оригиналу"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Синхронизировать
          </Button>

          <Button
            variant={syncScroll ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSyncScroll((v) => !v)}
          >
            Скролл
          </Button>

          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 className="h-4 w-4 mr-2" />
            Очистить
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!translatedText.trim()}
            className="ml-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Скачать
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EditorPanel
          title="Оригинал"
          subtitle={LANGUAGES.find((l) => l.value === sourceLang)?.label ?? sourceLang}
          value={originalText}
          onChange={setOriginalText}
          placeholder="Вставьте текст или импортируйте DOCX / PDF…"
          panelRef={originalRef}
          onScroll={handleOriginalScroll}
        />
        <EditorPanel
          title="Перевод"
          subtitle={LANGUAGES.find((l) => l.value === targetLang)?.label ?? targetLang}
          value={translatedText}
          onChange={setTranslatedText}
          placeholder="Перевод появится здесь. Текст можно редактировать вручную."
          panelRef={translatedRef}
          onScroll={handleTranslatedScroll}
        />
      </div>

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Импорт документа"
        size="md"
      >
        <FileUpload
          key={isImportModalOpen ? "open" : "closed"}
          onFilesSelected={handleImportFiles}
          acceptedTypes={[".pdf", ".docx", ".txt", ".md"]}
          multiple={false}
          maxSizeMB={50}
        />
      </Modal>
    </div>
  );
}
