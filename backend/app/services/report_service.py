import io
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy.orm import Session
from app.models import Assessment, Correction, Document


from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Canvas that performs two passes to add 'Page X of Y' on all pages."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pages = []

    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self.pages)
        for page in self.pages:
            self.__dict__.update(page)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(40, 36, 572, 36)
        text = f"DocuQuality Quality Audit • Page {self._pageNumber} of {page_count}"
        self.drawString(40, 24, text)
        self.drawRightString(572, 24, "Confidential Document Quality Report")
        self.restoreState()


def _create_thumbnail_image(img_path: str, max_w: float = 2.2 * inch, max_h: float = 2.6 * inch) -> Optional[Image]:
    """Generates a scaled ReportLab Image object from an image file."""
    if not img_path or not os.path.exists(img_path):
        return None
    try:
        with PILImage.open(img_path) as im:
            w, h = im.size
            ratio = min(max_w / w, max_h / h)
            new_w = w * ratio
            new_h = h * ratio

            temp_buf = io.BytesIO()
            im.save(temp_buf, format="JPEG", quality=85)
            temp_buf.seek(0)
            return Image(temp_buf, width=new_w, height=new_h)
    except Exception:
        return None


def generate_single_document_report(doc: Document, db: Session) -> io.BytesIO:
    """
    Builds a professional, comprehensive Document Image Quality Assessment and Auto-Correction System PDF Report.
    """
    buffer = io.BytesIO()
    doc_template = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=50,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=2,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b"),
    )
    section_title_style = ParagraphStyle(
        "SectionTitle",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )
    badge_style = ParagraphStyle(
        "BadgeText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        alignment=1,
    )
    code_style = ParagraphStyle(
        "CodeSnippet",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#1e293b"),
    )

    story = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("<b>DocuQuality</b> • Document Image Quality Assessment and Auto-Correction System", title_style),
            Paragraph(f"<b>Report ID:</b> {doc.id[:8]}<br/><b>Date:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", subtitle_style),
        ]
    ]
    header_table = Table(header_data, colWidths=[380, 152])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#4f46e5"), spaceAfter=12))

    # 2. Document Summary Card
    before_rec = next((a for a in doc.assessments if a.stage == "before"), None)
    after_rec = next((a for a in doc.assessments if a.stage == "after"), None)

    score_before = before_rec.overall_score if before_rec else 0.0
    score_after = after_rec.overall_score if after_rec else score_before
    status_label = (doc.status or "pass").replace("_", " ").title()

    status_color = colors.HexColor("#059669") if status_label.lower() == "pass" else (
        colors.HexColor("#d97706") if "correction" in status_label.lower() else colors.HexColor("#dc2626")
    )

    meta_table_data = [
        [
            Paragraph(f"<b>Filename:</b> {doc.filename}", body_style),
            Paragraph(f"<b>Preset:</b> {(doc.preset or 'general').capitalize()}", body_style),
            Paragraph(f"<b>Initial Score:</b> <b>{score_before:.1f}</b>/100", body_style),
            Paragraph(f"<b>Final Score:</b> <b>{score_after:.1f}</b>/100 ({score_after - score_before:+.1f})", body_style),
            Paragraph(f"<font color='{status_color.hexval()}'><b>{status_label}</b></font>", badge_style),
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[160, 95, 95, 115, 67])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # 3. Before vs After Visual Thumbnails
    story.append(Paragraph("Visual Restoration Comparison", section_title_style))
    thumb_before = _create_thumbnail_image(doc.original_path)
    thumb_after = _create_thumbnail_image(doc.corrected_path) if doc.corrected_path else thumb_before

    thumb_content = [
        [thumb_before or Paragraph("<i>Original image preview not available</i>", body_style),
         thumb_after or Paragraph("<i>Corrected image preview not available</i>", body_style)],
        [Paragraph(f"<b>Original Capture</b> (Score: {score_before:.1f})", body_style),
         Paragraph(f"<b>Restored Result</b> (Score: {score_after:.1f})", body_style)],
    ]
    thumb_table = Table(thumb_content, colWidths=[266, 266])
    thumb_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("BOX", (0, 0), (0, 0), 1, colors.HexColor("#cbd5e1")),
        ("BOX", (1, 0), (1, 0), 1, colors.HexColor("#cbd5e1")),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 6),
        ("TOPPADDING", (0, 1), (-1, 1), 4),
    ]))
    story.append(thumb_table)
    story.append(Spacer(1, 12))

    # 4. Objective Quality Metrics Breakdown Table
    story.append(Paragraph("Quality Metrics & Diagnostic Analysis", section_title_style))

    metrics_rows = [
        [
            Paragraph("<b>Metric</b>", body_style),
            Paragraph("<b>Raw Value</b>", body_style),
            Paragraph("<b>Pre-Score</b>", body_style),
            Paragraph("<b>Post-Score</b>", body_style),
            Paragraph("<b>Delta</b>", body_style),
            Paragraph("<b>Status</b>", body_style),
            Paragraph("<b>Diagnostic Finding</b>", body_style),
        ]
    ]

    before_defects = {}
    if before_rec and before_rec.defects_json:
        try:
            for d in json.loads(before_rec.defects_json):
                before_defects[d.get("metric")] = d
        except Exception:
            pass

    after_defects = {}
    if after_rec and after_rec.defects_json:
        try:
            for d in json.loads(after_rec.defects_json):
                after_defects[d.get("metric")] = d
        except Exception:
            pass

    display_metrics = [
        ("blur", "Blur & Sharpness"),
        ("skew", "Skew Alignment"),
        ("brightness", "Illumination & Shadows"),
        ("contrast", "Dynamic Range & Contrast"),
        ("noise", "Sensor Noise & Grain"),
        ("resolution", "Resolution & DPI"),
        ("glare", "Glare & Reflections"),
        ("cutoff", "Page Margins Framing"),
        ("orientation", "Document Orientation"),
    ]

    for m_key, m_label in display_metrics:
        b_item = before_defects.get(m_key, {})
        a_item = after_defects.get(m_key, {})

        b_sub = b_item.get("sub_score", 100.0)
        a_sub = a_item.get("sub_score", b_sub)
        d_val = a_sub - b_sub
        status = b_item.get("status", "good").upper()
        raw_val = f"{b_item.get('raw_value', '-')} {b_item.get('unit', '')}".strip()
        explanation = b_item.get("explanation", "Nominal parameters.")

        st_color = "#059669" if status == "GOOD" else ("#d97706" if status == "WARNING" else "#dc2626")

        metrics_rows.append([
            Paragraph(f"<b>{m_label}</b>", body_style),
            Paragraph(raw_val, body_style),
            Paragraph(f"{b_sub:.1f}", body_style),
            Paragraph(f"{a_sub:.1f}", body_style),
            Paragraph(f"{d_val:+.1f}", body_style),
            Paragraph(f"<font color='{st_color}'><b>{status}</b></font>", body_style),
            Paragraph(explanation, body_style),
        ])

    metrics_table = Table(metrics_rows, colWidths=[110, 70, 52, 52, 45, 55, 148])
    metrics_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 12))

    # 5. Rescan Guidance & Actionable Advice
    guidance_list = []
    if before_rec and before_rec.rescan_guidance_json:
        try:
            guidance_list = json.loads(before_rec.rescan_guidance_json)
        except Exception:
            pass

    if guidance_list:
        story.append(Paragraph("Actionable Rescan Guidance & Best Practices", section_title_style))
        guide_rows = [
            [
                Paragraph("<b>Defect</b>", body_style),
                Paragraph("<b>Severity</b>", body_style),
                Paragraph("<b>Actionable Recapture Tip</b>", body_style),
            ]
        ]
        for g in guidance_list:
            is_crit = g.get("severity") == "critical"
            sev_color = "#dc2626" if is_crit else "#d97706"
            guide_rows.append([
                Paragraph(f"<b>{g.get('title', g.get('defect'))}</b>", body_style),
                Paragraph(f"<font color='{sev_color}'><b>{g.get('severity', '').upper()}</b></font>", body_style),
                Paragraph(g.get("tip", ""), body_style),
            ])
        guide_table = Table(guide_rows, colWidths=[130, 70, 332])
        guide_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#fef3c7")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#fcd34d")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fffbeb")]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(guide_table)
        story.append(Spacer(1, 12))

    # 6. Applied Corrections Pipeline
    story.append(Paragraph("Targeted Auto-Corrections Applied", section_title_style))
    corrs = sorted(doc.corrections, key=lambda c: c.order)
    if corrs:
        corr_rows = [
            [
                Paragraph("<b>Step #</b>", body_style),
                Paragraph("<b>Correction Step</b>", body_style),
                Paragraph("<b>Description & Tuning Parameters</b>", body_style),
            ]
        ]
        for c in corrs:
            corr_rows.append([
                Paragraph(f"#{c.order + 1}", body_style),
                Paragraph(f"<b>{c.step_name.replace('_', ' ').title()}</b>", body_style),
                Paragraph(c.description or "Automated algorithmic enhancement.", body_style),
            ])
        corr_table = Table(corr_rows, colWidths=[50, 140, 342])
        corr_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(corr_table)
    else:
        story.append(Paragraph("<i>No corrections required; original document met high-fidelity quality thresholds.</i>", body_style))
    story.append(Spacer(1, 12))

    # 7. OCR Readiness Proof
    story.append(Paragraph("OCR Readiness & Extraction Proof", section_title_style))
    ocr_b_conf = doc.ocr_confidence_before or 0.0
    ocr_a_conf = doc.ocr_confidence_after or 0.0
    ocr_b_words = doc.ocr_word_count_before or 0
    ocr_a_words = doc.ocr_word_count_after or 0
    words_rec = max(0, ocr_a_words - ocr_b_words)

    ocr_summary_data = [
        [
            Paragraph(f"<b>OCR Engine:</b> {doc.ocr_engine or 'Tesseract OCR'}", body_style),
            Paragraph(f"<b>Confidence:</b> {ocr_b_conf:.1f}% → <b>{ocr_a_conf:.1f}%</b> ({ocr_a_conf - ocr_b_conf:+.1f}%)", body_style),
            Paragraph(f"<b>Word Count:</b> {ocr_b_words} → <b>{ocr_a_words}</b> (+{words_rec} words recovered)", body_style),
        ]
    ]
    ocr_table = Table(ocr_summary_data, colWidths=[180, 180, 172])
    ocr_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#bbf7d0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(ocr_table)
    story.append(Spacer(1, 8))

    # Extracted Text Snippet
    txt_after = (doc.ocr_text_after or "No text recognized.").strip()
    if len(txt_after) > 350:
        txt_after = txt_after[:350] + "..."
    # Escape HTML special chars for reportlab
    clean_txt = txt_after.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")

    text_card = [
        [Paragraph("<b>OCR Extracted Text Sample (Corrected Document):</b>", body_style)],
        [Paragraph(clean_txt, code_style)],
    ]
    text_table = Table(text_card, colWidths=[532])
    text_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(text_table)

    # Build PDF with footer
    doc_template.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer


def generate_batch_report(batch_id: str, db: Session) -> io.BytesIO:
    """
    Builds a summary audit report for an entire batch of processed documents.
    """
    buffer = io.BytesIO()
    doc_template = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=50,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "BatchTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=2,
    )
    subtitle_style = ParagraphStyle(
        "BatchSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b"),
    )
    section_title_style = ParagraphStyle(
        "SectionTitle",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )

    docs = db.query(Document).filter(Document.batch_id == batch_id).all()
    story = []

    # 1. Header
    header_data = [
        [
            Paragraph("<b>DocuQuality</b> • Batch Quality Audit & Delivery Report", title_style),
            Paragraph(f"<b>Batch ID:</b> {batch_id[:8]}<br/><b>Date:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", subtitle_style),
        ]
    ]
    header_table = Table(header_data, colWidths=[380, 152])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#4f46e5"), spaceAfter=12))

    total_docs = len(docs)
    pass_cnt = sum(1 for d in docs if d.status == "pass")
    nc_cnt = sum(1 for d in docs if "correction" in d.status)
    fail_cnt = sum(1 for d in docs if d.status == "fail")

    # Averages
    scores_before = []
    scores_after = []
    ocr_gains = []
    for d in docs:
        b_rec = next((a for a in d.assessments if a.stage == "before"), None)
        a_rec = next((a for a in d.assessments if a.stage == "after"), None)
        if b_rec:
            scores_before.append(b_rec.overall_score)
        if a_rec:
            scores_after.append(a_rec.overall_score)
        if d.ocr_confidence_before is not None and d.ocr_confidence_after is not None:
            ocr_gains.append(max(0.0, d.ocr_confidence_after - d.ocr_confidence_before))

    avg_b = (sum(scores_before) / len(scores_before)) if scores_before else 0.0
    avg_a = (sum(scores_after) / len(scores_after)) if scores_after else 0.0
    avg_gain = (sum(ocr_gains) / len(ocr_gains)) if ocr_gains else 0.0
    pass_rate = (pass_cnt / max(1, total_docs)) * 100.0

    # 2. Batch KPI Cards
    kpi_data = [
        [
            Paragraph(f"<b>Total Documents</b><br/><font size='14'><b>{total_docs}</b></font>", body_style),
            Paragraph(f"<b>Pass Rate</b><br/><font size='14' color='#059669'><b>{pass_rate:.1f}%</b></font>", body_style),
            Paragraph(f"<b>Avg Score Before → After</b><br/><font size='14'><b>{avg_b:.1f} → {avg_a:.1f}</b></font>", body_style),
            Paragraph(f"<b>Avg OCR Confidence Gain</b><br/><font size='14' color='#4f46e5'><b>+{avg_gain:.1f}%</b></font>", body_style),
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[120, 120, 146, 146])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 14))

    # 3. Documents Table
    story.append(Paragraph(f"Processed Documents ({total_docs} files)", section_title_style))

    doc_rows = [
        [
            Paragraph("<b>Filename</b>", body_style),
            Paragraph("<b>Page</b>", body_style),
            Paragraph("<b>Preset</b>", body_style),
            Paragraph("<b>Pre-Score</b>", body_style),
            Paragraph("<b>Post-Score</b>", body_style),
            Paragraph("<b>Improvement</b>", body_style),
            Paragraph("<b>Status</b>", body_style),
        ]
    ]

    for d in docs:
        b_rec = next((a for a in d.assessments if a.stage == "before"), None)
        a_rec = next((a for a in d.assessments if a.stage == "after"), None)
        sb = b_rec.overall_score if b_rec else 0.0
        sa = a_rec.overall_score if a_rec else sb
        delta = sa - sb
        st_label = d.status.replace("_", " ").title()
        st_color = "#059669" if st_label.lower() == "pass" else ("#d97706" if "correction" in st_label.lower() else "#dc2626")

        doc_rows.append([
            Paragraph(d.filename, body_style),
            Paragraph(str(d.page_no), body_style),
            Paragraph((d.preset or "general").capitalize(), body_style),
            Paragraph(f"{sb:.1f}", body_style),
            Paragraph(f"{sa:.1f}", body_style),
            Paragraph(f"{delta:+.1f}", body_style),
            Paragraph(f"<font color='{st_color}'><b>{st_label}</b></font>", body_style),
        ])

    batch_table = Table(doc_rows, colWidths=[172, 35, 75, 60, 60, 65, 65])
    batch_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(batch_table)

    doc_template.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer
