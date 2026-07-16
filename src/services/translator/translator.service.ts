import {
  getAiProviderSummary,
  isAiApiConfigured,
  sendChatMessage,
} from "@/shared/services/ai.service";

export type TranslatorLanguage = "RUS" | "KAZ" | "ENG";

const LANGUAGE_LABELS: Record<TranslatorLanguage, string> = {
  RUS: "русский",
  KAZ: "казахский (кириллица)",
  ENG: "английский",
};

const MYMEMORY_LANG: Record<TranslatorLanguage, string> = {
  RUS: "ru",
  KAZ: "kk",
  ENG: "en",
};

const CHUNK_CHAR_LIMIT = 3500;
const MYMEMORY_CHAR_LIMIT = 450;

function buildSystemPrompt(from: TranslatorLanguage, to: TranslatorLanguage): string {
  const kazHint =
    to === "KAZ"
      ? `
- Пиши только на казахском языке кириллицей (ә, ғ, қ, ң, ө, ұ, ү, һ где нужно)
- Не оставляй русский текст без перевода
- Не используй латиницу для казахского
`
      : "";

  return `Ты профессиональный корпоративный переводчик.

Задача: перевести текст с ${LANGUAGE_LABELS[from]} на ${LANGUAGE_LABELS[to]}.
${kazHint}
Требования:
- Сохраняй деловой стиль и точность терминологии
- Сохраняй структуру абзацев (разделяй абзацы пустой строкой)
- Не добавляй комментарии, пояснения и метаданные
- Верни только переведённый текст без префиксов вроде «Перевод:»`;
}

function splitIntoChunks(text: string, limit = CHUNK_CHAR_LIMIT): string[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
  if (paragraphs.length === 0) return [text];

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > limit && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

async function translateChunk(
  text: string,
  fromLang: TranslatorLanguage,
  toLang: TranslatorLanguage,
  signal?: AbortSignal
): Promise<string> {
  if (signal?.aborted) {
    throw new DOMException("Перевод отменён", "AbortError");
  }

  const response = await sendChatMessage(
    [{ role: "user", content: text }],
    {
      model: import.meta.env.VITE_AI_MODEL || "gpt-3.5-turbo",
      temperature: 0.2,
      maxTokens: 4000,
      systemPrompt: buildSystemPrompt(fromLang, toLang),
      allowMock: false,
    }
  );

  if (signal?.aborted) {
    throw new DOMException("Перевод отменён", "AbortError");
  }

  const translated = response.content?.trim();
  if (!translated) {
    throw new Error("Пустой ответ от сервиса перевода");
  }

  return translated;
}

/** Бесплатный fallback RU↔KK↔EN через MyMemory (лимит ~450 символов на запрос) */
export async function translateViaMyMemory(
  text: string,
  fromLang: TranslatorLanguage,
  toLang: TranslatorLanguage,
  signal?: AbortSignal
): Promise<string> {
  const pieces = splitIntoChunks(text, MYMEMORY_CHAR_LIMIT);
  const out: string[] = [];

  for (const piece of pieces) {
    if (signal?.aborted) {
      throw new DOMException("Перевод отменён", "AbortError");
    }
    const langpair = `${MYMEMORY_LANG[fromLang]}|${MYMEMORY_LANG[toLang]}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(piece)}&langpair=${langpair}`;
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`MyMemory HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    const translated = data.responseData?.translatedText?.trim();
    if (!translated || data.responseStatus !== 200) {
      throw new Error("MyMemory не вернул перевод");
    }
    // Иногда API возвращает тот же текст — считаем ошибкой для казахского
    if (toLang === "KAZ" && translated === piece && /[а-яА-ЯёЁ]/.test(piece)) {
      throw new Error("MyMemory не перевёл на казахский");
    }
    out.push(translated);
    // лёгкий throttle
    await new Promise((r) => setTimeout(r, 120));
  }

  return out.join("\n\n");
}

/** Перевод по коротким фрагментам (для ячеек таблиц и тех. терминов) */
export async function translateViaMyMemoryFragments(
  text: string,
  fromLang: TranslatorLanguage,
  toLang: TranslatorLanguage,
  signal?: AbortSignal
): Promise<string> {
  const fragments = text
    .split(/(\s*[—–/|,;]\s*)/)
    .filter((f) => f.length > 0);
  if (fragments.length <= 1) {
    return translateViaMyMemory(text, fromLang, toLang, signal);
  }
  const out: string[] = [];
  for (const frag of fragments) {
    if (/^\s*[—–/|,;]\s*$/.test(frag)) {
      out.push(frag);
      continue;
    }
    const trimmed = frag.trim();
    if (!trimmed) continue;
    try {
      const t = await translateViaMyMemory(trimmed, fromLang, toLang, signal);
      out.push(t);
    } catch {
      out.push(localFallbackTranslate(trimmed, fromLang, toLang));
    }
    await new Promise((r) => setTimeout(r, 80));
  }
  return out.join("");
}

export function isTranslatorConfigured(): boolean {
  return isAiApiConfigured();
}

export function getTranslatorProviderSummary() {
  return getAiProviderSummary();
}

export async function translateText(
  text: string,
  fromLang: TranslatorLanguage,
  toLang: TranslatorLanguage,
  signal?: AbortSignal,
  onProgress?: (completed: number, total: number) => void
): Promise<string> {
  if (!text.trim()) {
    throw new Error("Нет текста для перевода");
  }

  if (fromLang === toLang) {
    throw new Error("Языки источника и перевода должны отличаться");
  }

  if (!isAiApiConfigured()) {
    throw new Error(
      "AI API не настроен. Добавьте VITE_OPENAI_API_KEY в файл .env и перезапустите dev-сервер."
    );
  }

  const chunks = splitIntoChunks(text);
  const results: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(i + 1, chunks.length);
    const translated = await translateChunk(chunks[i], fromLang, toLang, signal);
    results.push(translated);
  }

  return results.join("\n\n");
}

/**
 * Надёжный перевод сегмента: AI → MyMemory → локальный RU→KK fallback.
 * Всегда старается вернуть текст на целевом языке (для KAZ — кириллица).
 */
export async function translateSegmentRobust(
  text: string,
  fromLang: TranslatorLanguage,
  toLang: TranslatorLanguage,
  signal?: AbortSignal
): Promise<{ text: string; engine: "ai" | "mymemory" | "local" }> {
  if (!text.trim()) return { text: "", engine: "local" };
  if (fromLang === toLang) return { text, engine: "local" };

  if (isAiApiConfigured()) {
    try {
      const ai = await translateText(text, fromLang, toLang, signal);
      if (ai.trim()) return { text: ai, engine: "ai" };
    } catch {
      // fallback ниже
    }
  }

  try {
    const mm = await translateViaMyMemory(text, fromLang, toLang, signal);
    if (mm.trim()) return { text: mm, engine: "mymemory" };
  } catch {
    // fragment fallback for short / technical strings
    if (fromLang === "RUS" && toLang === "KAZ" && text.length < 500) {
      try {
        const frag = await translateViaMyMemoryFragments(text, fromLang, toLang, signal);
        if (frag.trim() && frag !== text) return { text: frag, engine: "mymemory" };
      } catch {
        // local below
      }
    }
  }

  return { text: localFallbackTranslate(text, fromLang, toLang), engine: "local" };
}

/** Локальный запасной RU→KK (фразы + слова), чтобы UI не оставлял русский */
export function localFallbackTranslate(
  text: string,
  fromLang: TranslatorLanguage,
  toLang: TranslatorLanguage
): string {
  if (fromLang === "RUS" && toLang === "KAZ") {
    return ruToKkLocal(text);
  }
  if (fromLang === "KAZ" && toLang === "RUS") {
    return kkToRuLocal(text);
  }
  if (toLang === "ENG" && fromLang === "RUS") {
    return `[EN] ${text}`;
  }
  if (toLang === "RUS" && fromLang === "ENG") {
    return `[RU] ${text}`;
  }
  return text;
}

const RU_KK_PHRASES: [string, string][] = [
  ["Разработка UX/UI прототипа", "UX/UI прототипін әзірлеу"],
  ["Отчёт о проделанной работе", "Жасалған жұмыс туралы есеп"],
  ["II квартал 2026", "2026 жылғы II тоқсан"],
  ["AI-HUB Enterprise Platform", "AI-HUB Enterprise Platform"],
  ["интерактивный UX/UI прототип", "интерактивті UX/UI прототипі"],
  ["модуля «Лаборатория»", "«Зертхана» модулінің"],
  ["модуль «Лаборатория»", "«Зертхана» модулі"],
  ["корпоративных AI-агентов", "корпоративтік AI-агенттерді"],
  ["workflow-автоматизаций", "workflow-автоматтандыруларды"],
  ["ML-пайплайнов", "ML-пайплайндарды"],
  ["единой среды", "бірыңғай орта"],
  ["пользовательский опыт", "пайдаланушы тәжірибесі"],
  ["готовых шаблонов", "дайын үлгілер"],
  ["библиотека узлов", "түйіндер кітапханасы"],
  ["визуальный конструктор", "визуалды конструктор"],
  ["техническая спецификация", "техникалық сипаттама"],
  ["Структура документа", "Құжат құрылымы"],
  ["Утвердить все", "Барлығын бекіту"],
  ["На проверке", "Тексеруде"],
  ["Точные", "Дәл"],
  ["Похожие", "Ұқсас"],
  ["Новые", "Жаңа"],
  ["Всего", "Барлығы"],
];

const RU_KK_WORDS: [string, string][] = [
  ["отчёт", "есеп"],
  ["отчет", "есеп"],
  ["квартал", "тоқсан"],
  ["года", "жылы"],
  ["год", "жыл"],
  ["разработка", "әзірлеу"],
  ["прототип", "прототип"],
  ["модуль", "модуль"],
  ["лаборатория", "зертхана"],
  ["платформа", "платформа"],
  ["агент", "агент"],
  ["агентов", "агенттерді"],
  ["документов", "құжаттар"],
  ["документа", "құжаттың"],
  ["документ", "құжат"],
  ["перевод", "аударма"],
  ["переводчик", "аудармашы"],
  ["пользователь", "пайдаланушы"],
  ["опыт", "тәжірибе"],
  ["шаблон", "үлгі"],
  ["шаблонов", "үлгілер"],
  ["библиотека", "кітапхана"],
  ["узлов", "түйіндер"],
  ["узел", "түйін"],
  ["данные", "деректер"],
  ["датасет", "датасет"],
  ["модель", "модель"],
  ["модели", "модельдер"],
  ["выполнение", "орындау"],
  ["сохранение", "сақтау"],
  ["развёртывание", "орналастыру"],
  ["развертывание", "орналастыру"],
  ["интеграция", "интеграция"],
  ["система", "жүйе"],
  ["процесс", "процесс"],
  ["сценарий", "сценарий"],
  ["требования", "талаптар"],
  ["результаты", "нәтижелер"],
  ["заключение", "қорытынды"],
  ["резюме", "тұжырым"],
  ["цели", "мақсаттар"],
  ["цель", "мақсат"],
  ["работа", "жұмыс"],
  ["работы", "жұмыс"],
  ["проделанной", "жасалған"],
  ["единой", "бірыңғай"],
  ["среды", "орта"],
  ["создание", "жасау"],
  ["создания", "жасау"],
  ["корпоративных", "корпоративтік"],
  ["корпоративный", "корпоративтік"],
  ["интерактивный", "интерактивті"],
  ["визуальный", "визуалды"],
  ["конструктор", "конструктор"],
  ["согласован", "келісілген"],
  ["готово", "дайын"],
  ["готов", "дайын"],
  ["демонстрации", "демонстрацияға"],
  ["стейкхолдерам", "стейкхолдерлерге"],
  ["Нода", "Түйін"],
  ["нода", "түйін"],
  ["Тип", "Түрі"],
  ["тип", "түрі"],
  ["Назначение", "Мақсаты"],
  ["назначение", "мақсаты"],
  ["Триггер", "Триггер"],
  ["триггер", "триггер"],
  ["агент", "агент"],
  ["Агент", "Агент"],
  ["мониторинг", "мониторинг"],
  ["алерт", "ескерту"],
  ["алертов", "ескертулер"],
  ["базе знаний", "білім базасында"],
  ["базы знаний", "білім базасы"],
  ["кейсы", "кейстер"],
  ["Кейсы", "Кейстер"],
  ["кейс", "кейс"],
  ["Кейс", "Кейс"],
];

function replaceCaseAware(haystack: string, from: string, to: string): string {
  const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return haystack.replace(re, (match) => {
    if (match === match.toUpperCase() && match.length > 1) return to.toUpperCase();
    if (match[0] === match[0].toUpperCase()) {
      return to.charAt(0).toUpperCase() + to.slice(1);
    }
    return to;
  });
}

function ruToKkLocal(text: string): string {
  let result = text;
  const phrases = [...RU_KK_PHRASES].sort((a, b) => b[0].length - a[0].length);
  for (const [ru, kk] of phrases) {
    result = replaceCaseAware(result, ru, kk);
  }
  const words = [...RU_KK_WORDS].sort((a, b) => b[0].length - a[0].length);
  for (const [ru, kk] of words) {
    result = replaceCaseAware(result, ru, kk);
  }
  // Если словарь не покрыл текст — возвращаем как есть (без плейсхолдера)
  return result;
}

function kkToRuLocal(text: string): string {
  let result = text;
  for (const [ru, kk] of [...RU_KK_PHRASES, ...RU_KK_WORDS]) {
    result = replaceCaseAware(result, kk, ru);
  }
  return result === text ? `[RU] ${text}` : result;
}

export function downloadTranslation(
  content: string,
  filename = "translation.txt"
): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
