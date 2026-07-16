import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";

const BASE = process.env.APP_URL || "http://localhost:8080";
const OUT_DIR = path.resolve("docs/report-q2-2026/screenshots");

async function enableDevMode(page) {
  const toggle = page.locator("#dev-mode-toggle");
  if (await toggle.isVisible({ timeout: 8000 }).catch(() => false)) {
    const checked = await toggle.getAttribute("data-state");
    if (checked !== "checked") {
      await toggle.click();
      await page.waitForTimeout(500);
    }
  }
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("saved", file);
  return file;
}

async function goToLab(page) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await enableDevMode(page);
  const labLink = page.getByRole("link", { name: /Лаборатория|Laboratory/i });
  await labLink.click();
  await page.waitForURL("**/lab**", { timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function openAgentsStudio(page) {
  await page.getByRole("tab", { name: "Agents-Studio" }).click();
  await page.waitForTimeout(900);
}

async function closeRightPanel(page) {
  const close = page.locator('[data-component-file="NodeProperties.tsx"] button').first();
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await page.waitForTimeout(400);
  }
}

async function closeGallery(page) {
  const closeBtn = page.locator('[data-component-file="TemplateGallery.tsx"] button').first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(400);
    return;
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
}

async function openTemplates(page) {
  await closeGallery(page);
  const templatesBtn = page.getByRole("button", { name: /Шаблоны/i });
  await templatesBtn.click({ force: true });
  await page.waitForTimeout(700);
}

async function loadTemplate(page, templateName) {
  await openTemplates(page);
  const card = page.getByText(templateName, { exact: false }).first();
  await card.click();
  await page.waitForTimeout(1200);
  await closeGallery(page);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // --- Датасеты ---
  await goToLab(page);
  await shot(page, "01-lab-datasets");

  const salesDataset = page.getByText("Продажи 2024").first();
  if (await salesDataset.isVisible().catch(() => false)) {
    await salesDataset.click();
    await page.waitForTimeout(600);
    await shot(page, "02-dataset-selected");
  }

  // --- Agents-Studio ---
  await openAgentsStudio(page);
  await shot(page, "03-agents-studio-canvas");

  const paletteSearch = page.getByPlaceholder(/Поиск узлов|Search/i);
  if (await paletteSearch.isVisible().catch(() => false)) {
    await paletteSearch.fill("RAG");
    await page.waitForTimeout(400);
  }
  await shot(page, "04-node-library");
  if (await paletteSearch.isVisible().catch(() => false)) {
    await paletteSearch.fill("");
    await page.waitForTimeout(300);
  }

  await openTemplates(page);
  await shot(page, "05-workflow-templates");
  await closeGallery(page);

  await loadTemplate(page, "FAQ-бот по документам");
  await shot(page, "06-faq-workflow");

  const ragNode = page.getByText("RAG Search", { exact: false }).first();
  if (await ragNode.isVisible().catch(() => false)) {
    await ragNode.click();
    await page.waitForTimeout(800);
    const showPanel = page.getByTitle("Показать панель свойств");
    if (await showPanel.isVisible().catch(() => false)) {
      await showPanel.click();
      await page.waitForTimeout(500);
    }
    await shot(page, "07-node-properties");
  }

  const runBtn = page.getByRole("button", { name: /^Запустить$/i });
  if (await runBtn.isVisible().catch(() => false)) {
    await closeRightPanel(page);
    await runBtn.click({ force: true });
    await page.waitForTimeout(2800);
    await shot(page, "08-execution-panel");
  }

  const focusBtn = page.getByTitle(/Режим фокуса/i);
  if (await focusBtn.isVisible().catch(() => false)) {
    await closeRightPanel(page);
    await focusBtn.click({ force: true });
    await page.waitForTimeout(700);
    await shot(page, "09-focus-mode");
    const exitFocus = page.getByTitle(/Выйти из фокуса|Режим фокуса/i);
    if (await exitFocus.isVisible().catch(() => false)) {
      await exitFocus.click({ force: true });
    }
    await page.waitForTimeout(500);
  }

  await loadTemplate(page, "Агент обработки писем");
  await shot(page, "10-email-workflow");

  await loadTemplate(page, "Инцидент-бот");
  await shot(page, "11-incident-workflow");

  // --- ML-Studio ---
  await page.getByRole("tab", { name: "ML-Studio" }).click();
  await page.waitForTimeout(900);
  await shot(page, "12-ml-studio-overview");

  await page.locator('button[role="tab"]', { hasText: "Трансформация" }).click();
  await page.waitForTimeout(700);
  await shot(page, "13-ml-transformation");

  await page.locator('button[role="tab"]', { hasText: "AutoML" }).click();
  await page.waitForTimeout(700);
  await shot(page, "14-ml-automl");

  await page.locator('button[role="tab"]', { hasText: "Модели" }).click();
  await page.waitForTimeout(700);
  await shot(page, "15-ml-models-registry");

  await browser.close();
  console.log("Done — 15 screenshots");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
