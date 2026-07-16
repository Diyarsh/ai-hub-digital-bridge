/**
 * Импорт документов для инструмента «Переводчик».
 * Сохраняет абзацную структуру (в отличие от presentation/document-text).
 */

import mammoth from "mammoth";

function preserveParagraphs(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  const text = preserveParagraphs(value || "");
  if (!text) {
    throw new Error("Не удалось извлечь текст из DOCX (файл пустой или повреждён)");
  }
  return text;
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const { default: workerUrl } = await import(
    "pdfjs-dist/build/pdf.worker.min.mjs?url"
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    if (line.trim()) parts.push(line.trim());
  }

  const text = preserveParagraphs(parts.join("\n"));
  if (!text) {
    throw new Error(
      "Не удалось извлечь текст из PDF (возможно, только сканы без текстового слоя)"
    );
  }
  return text;
}

export async function readDocumentForTranslation(file: File): Promise<string> {
  const lower = file.name.toLowerCase();

  if (/\.(txt|md|markdown)$/i.test(lower)) {
    const text = await file.text();
    return preserveParagraphs(text);
  }

  const buffer = await file.arrayBuffer();

  if (lower.endsWith(".docx")) {
    return extractDocxText(buffer);
  }

  if (lower.endsWith(".pdf")) {
    return extractPdfText(buffer);
  }

  if (lower.endsWith(".doc")) {
    throw new Error("Формат .doc не поддерживается. Сохраните файл как .docx");
  }

  throw new Error("Поддерживаются форматы: .txt, .md, .docx, .pdf");
}

export type DocBlockTag = "h1" | "h2" | "h3" | "h4" | "p" | "li" | "blockquote" | "table";

export interface DocumentBlock {
  id: string;
  tag: DocBlockTag;
  /** Исходный текст абзаца (для table — TSV строк) */
  source: string;
  /** HTML-фрагмент оформления (bold/italic внутри) — опционально */
  sourceHtml?: string;
  /** Таблица: строки × ячейки */
  tableRows?: string[][];
}

function newBlockId() {
  return `blk-${crypto.randomUUID()}`;
}

function normalizeTag(tag: string): DocBlockTag {
  const t = tag.toLowerCase();
  if (t === "h1" || t === "h2" || t === "h3" || t === "h4") return t;
  if (t === "li") return "li";
  if (t === "blockquote") return "blockquote";
  return "p";
}

function parseTable(table: Element): DocumentBlock {
  const rows: string[][] = [];
  table.querySelectorAll("tr").forEach((tr) => {
    const cells: string[] = [];
    tr.querySelectorAll("th, td").forEach((cell) => {
      cells.push((cell.textContent || "").replace(/\s+/g, " ").trim());
    });
    if (cells.some((c) => c)) rows.push(cells);
  });
  const source = rows.map((r) => r.join("\t")).join("\n");
  return {
    id: newBlockId(),
    tag: "table",
    source,
    tableRows: rows,
    sourceHtml: table.outerHTML,
  };
}

function htmlToBlocks(html: string): DocumentBlock[] {
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = doc.getElementById("root");
  if (!root) return [];

  const blocks: DocumentBlock[] = [];
  const walk = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "table") {
      blocks.push(parseTable(el));
      return;
    }
    if (["h1", "h2", "h3", "h4", "p", "li", "blockquote"].includes(tag)) {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) return;
      blocks.push({
        id: newBlockId(),
        tag: normalizeTag(tag),
        source: text,
        sourceHtml: el.innerHTML,
      });
      return;
    }
    if (["ul", "ol", "tbody", "thead", "tr", "td", "th", "div"].includes(tag)) {
      Array.from(el.children).forEach((child) => walk(child));
      return;
    }
    if (el.children.length === 0) {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (text) {
        blocks.push({ id: newBlockId(), tag: "p", source: text, sourceHtml: text });
      }
    } else {
      Array.from(el.children).forEach((child) => walk(child));
    }
  };

  Array.from(root.children).forEach((child) => walk(child));

  if (blocks.length === 0) {
    const plain = (root.textContent || "").trim();
    if (plain) {
      plain
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .forEach((line) => {
          blocks.push({ id: newBlockId(), tag: "p", source: line, sourceHtml: line });
        });
    }
  }
  return blocks;
}

function textToBlocks(text: string): DocumentBlock[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((source) => ({
      id: newBlockId(),
      tag: "p" as const,
      source,
      sourceHtml: source,
    }));
}

/** Структурированный импорт для Переводчик 2.0 — сохраняет абзацы/заголовки */
export async function readDocumentBlocks(file: File): Promise<DocumentBlock[]> {
  const lower = file.name.toLowerCase();

  if (/\.(txt|md|markdown)$/i.test(lower)) {
    const text = await file.text();
    return textToBlocks(preserveParagraphs(text));
  }

  const buffer = await file.arrayBuffer();

  if (lower.endsWith(".docx")) {
    const { value } = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const blocks = htmlToBlocks(value || "");
    if (blocks.length === 0) {
      throw new Error("Не удалось извлечь структуру из DOCX");
    }
    return blocks;
  }

  if (lower.endsWith(".pdf")) {
    const text = await extractPdfText(buffer);
    return textToBlocks(text);
  }

  if (lower.endsWith(".doc")) {
    throw new Error("Формат .doc не поддерживается. Сохраните файл как .docx");
  }

  throw new Error("Поддерживаются форматы: .txt, .md, .docx, .pdf");
}
