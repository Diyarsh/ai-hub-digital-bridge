#!/usr/bin/env python3
"""PDF-версия отчёта Q2 2026 (фирменный синий + Graphik LCG)."""

import importlib.util
import shutil
from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image as RLImage,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "docs" / "report-q2-2026" / "screenshots"
FONTS = ROOT / "docs" / "report-q2-2026" / "fonts"
OUT = ROOT / "docs" / "report-q2-2026" / "Отчет_Лаборатория_Q2_2026.pdf"
DOWNLOADS_COPY = Path.home() / "Downloads" / "Отчет_Лаборатория_Q2_2026.pdf"

BLUE_DEEP = colors.HexColor("#2438C7")
BLUE_MID = colors.HexColor("#6478F5")
BLUE_LIGHT = colors.HexColor("#8BADFF")
ROW_ALT = colors.HexColor("#F0F4FF")
TEXT_BODY = colors.HexColor("#1E293B")
TEXT_MUTED = colors.HexColor("#64748B")
WHITE = colors.white

CAPTIONS: dict[str, str] = {}


def load_report_data():
    path = ROOT / "scripts" / "report-lab-data.py"
    spec = importlib.util.spec_from_file_location("report_lab_data", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.SECTIONS, mod.CAPTIONS


def register_fonts():
    pdfmetrics.registerFont(TTFont("GraphikLCG", str(FONTS / "GraphikLCG-Regular.ttf")))
    pdfmetrics.registerFont(TTFont("GraphikLCG-Bold", str(FONTS / "GraphikLCG-Bold.ttf")))
    pdfmetrics.registerFont(TTFont("GraphikLCG-Semibold", str(FONTS / "GraphikLCG-Semibold.ttf")))


def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=base["Normal"],
            fontName="GraphikLCG-Bold",
            fontSize=22,
            leading=28,
            textColor=WHITE,
            alignment=TA_LEFT,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=base["Normal"],
            fontName="GraphikLCG-Semibold",
            fontSize=14,
            leading=18,
            textColor=BLUE_LIGHT,
            alignment=TA_LEFT,
        ),
        "meta": ParagraphStyle(
            "meta",
            parent=base["Normal"],
            fontName="GraphikLCG",
            fontSize=11,
            leading=14,
            textColor=WHITE,
            alignment=TA_LEFT,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="GraphikLCG-Semibold",
            fontSize=16,
            leading=20,
            textColor=BLUE_DEEP,
            spaceBefore=14,
            spaceAfter=8,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="GraphikLCG",
            fontSize=11,
            leading=15,
            textColor=TEXT_BODY,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["Normal"],
            fontName="GraphikLCG",
            fontSize=11,
            leading=15,
            textColor=TEXT_BODY,
            leftIndent=14,
            bulletIndent=6,
            spaceAfter=4,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["Normal"],
            fontName="GraphikLCG",
            fontSize=9,
            leading=12,
            textColor=TEXT_MUTED,
            alignment=TA_CENTER,
            spaceAfter=10,
        ),
    }


def title_block(styles):
    rows = [
        [Paragraph("AI-HUB Enterprise Platform", styles["title"])],
        [Paragraph("UX/UI-дизайн интерактивного прототипа: «Лаборатория»", styles["subtitle"])],
        [Paragraph("Отчёт UX/UI-дизайнера за II квартал 2026 года", styles["meta"])],
    ]
    return [
        Table(
            rows,
            colWidths=[17 * cm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), BLUE_DEEP),
                ("LEFTPADDING", (0, 0), (-1, -1), 18),
                ("RIGHTPADDING", (0, 0), (-1, -1), 18),
                ("TOPPADDING", (0, 0), (0, 0), 22),
                ("BOTTOMPADDING", (-1, -1), (-1, -1), 22),
                ("TOPPADDING", (0, 1), (-1, -2), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -2), 4),
            ]),
        ),
        Table(
            [[""]],
            colWidths=[17 * cm],
            rowHeights=[4 * mm],
            style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), BLUE_MID)]),
        ),
        Spacer(1, 16),
    ]


def make_table(headers, rows, col_widths):
    data = [headers] + rows
    table = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), BLUE_DEEP),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "GraphikLCG-Semibold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("FONTNAME", (0, 1), (-1, -1), "GraphikLCG"),
        ("FONTSIZE", (0, 1), (-1, -1), 10),
        ("TEXTCOLOR", (0, 1), (-1, -1), TEXT_BODY),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))
    table.setStyle(TableStyle(style_cmds))
    return table


def scaled_image(path: Path, max_width: float):
    with Image.open(path) as img:
        w, h = img.size
    ratio = h / w
    width = min(max_width, w * 72 / 96)
    return RLImage(str(path), width=width, height=width * ratio)


def table_widths(headers):
    n = len(headers)
    total = 15.0
    if n == 2:
        return [10 * cm, 5 * cm]
    if n == 3:
        return [5.5 * cm, 6.5 * cm, 3 * cm]
    if n == 4:
        return [1.2 * cm, 6.5 * cm, 3.3 * cm, 4 * cm]
    return [total / n * cm] * n


def add_screenshot(story, styles, shot_id: str):
    filename = shot_id if shot_id.endswith(".png") else f"{shot_id}.png"
    path = SHOTS / filename
    if not path.exists():
        story.append(Paragraph(f"[Скриншот не найден: {filename}]", styles["body"]))
        return
    frame = Table(
        [[scaled_image(path, 15.5 * cm)]],
        colWidths=[16.5 * cm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), ROW_ALT),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]),
    )
    story.append(Spacer(1, 8))
    story.append(frame)
    story.append(Paragraph(CAPTIONS.get(filename.removesuffix(".png"), filename), styles["caption"]))


def render_sections(story, styles, sections):
    for section in sections:
        story.append(Paragraph(section["title"], styles["h1"]))
        for paragraph in section.get("paragraphs", []):
            story.append(Paragraph(paragraph, styles["body"]))
        for item in section.get("bullets", []):
            story.append(Paragraph(f"• {item}", styles["bullet"]))
        if "table" in section:
            table = section["table"]
            story.append(make_table(table["headers"], table["rows"], table_widths(table["headers"])))
            story.append(Spacer(1, 8))
        for shot_id in section.get("screenshots", []):
            add_screenshot(story, styles, shot_id)


def build():
    global CAPTIONS
    OUT.parent.mkdir(parents=True, exist_ok=True)
    register_fonts()
    styles = build_styles()
    sections, CAPTIONS = load_report_data()

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
        title="Отчёт Лаборатория Q2 2026",
        author="AI-HUB",
    )

    story = []
    story.extend(title_block(styles))
    render_sections(story, styles, sections)

    doc.build(story)
    shutil.copy2(OUT, DOWNLOADS_COPY)
    print(f"Saved: {OUT}")
    print(f"Copy:  {DOWNLOADS_COPY}")


if __name__ == "__main__":
    build()
