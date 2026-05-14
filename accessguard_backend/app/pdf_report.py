import io
import xml.sax.saxutils as saxutils
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from app.database import get_audit_by_id

def generate_pdf_report(audit_id: int) -> bytes:
    """
    Retrieves the audit from the database by ID and builds a multi-page, 
    branded PDF report containing the score, breakdown, and full AI remediation details.
    """
    audit_record = get_audit_by_id(audit_id)
    if not audit_record:
        raise ValueError(f"Audit ID {audit_id} not found.")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=40, bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'TitleStyle', parent=styles['Heading1'],
        fontSize=24, spaceAfter=20, alignment=1,
        textColor=colors.HexColor("#0f172a")
    )
    subtitle_style = ParagraphStyle(
        'SubtitleStyle', parent=styles['Normal'],
        fontSize=12, spaceAfter=40, alignment=1,
        textColor=colors.HexColor("#64748b")
    )
    heading2_style = ParagraphStyle(
        'Heading2Style', parent=styles['Heading2'],
        fontSize=16, spaceBefore=20, spaceAfter=10,
        textColor=colors.HexColor("#1e293b")
    )
    
    score_style_base = ParagraphStyle(
        'ScoreStyle', parent=styles['Normal'],
        fontSize=48, spaceAfter=40, alignment=1, fontName="Helvetica-Bold"
    )
    
    normal_style = styles['Normal']
    
    code_style = ParagraphStyle(
        'CodeStyle', parent=styles['Normal'],
        fontName='Courier', fontSize=9,
        textColor=colors.HexColor("#334155"),
        backColor=colors.HexColor("#f1f5f9"),
        borderPadding=6, leftIndent=10, rightIndent=10,
        spaceBefore=5, spaceAfter=10,
        wordWrap='CJK'  # Allows breaking long strings without spaces
    )
    
    ai_style = ParagraphStyle(
        'AiStyle', parent=styles['Normal'],
        fontSize=10, textColor=colors.HexColor("#0f766e"),
        backColor=colors.HexColor("#ccfbf1"),
        borderPadding=6, leftIndent=10, rightIndent=10,
        spaceBefore=5, spaceAfter=10,
        fontName="Helvetica-Oblique"
    )

    story = []

    # ==========================================
    # PAGE 1 - COVER PAGE
    # ==========================================
    story.append(Spacer(1, 100))
    story.append(Paragraph("AccessGuard Accessibility Audit Report", title_style))
    story.append(Paragraph("Self-Correcting Web Accessibility Intelligence", subtitle_style))
    
    # Score logic
    score = audit_record['score']
    if score >= 90:
        score_color = "#22c55e"
    elif score >= 70:
        score_color = "#eab308"
    else:
        score_color = "#ef4444"
        
    score_pstyle = ParagraphStyle('DynScore', parent=score_style_base, textColor=colors.HexColor(score_color))
    
    story.append(Paragraph(f"Score: {score}/100", score_pstyle))
    story.append(Spacer(1, 20))
    story.append(Paragraph(f"<b>Target URL:</b> {saxutils.escape(audit_record['url'])}", normal_style))
    story.append(Paragraph(f"<b>Audit Date:</b> {audit_record['timestamp']}", normal_style))
    
    story.append(PageBreak())

    # ==========================================
    # PAGE 2 - SUMMARY
    # ==========================================
    story.append(Paragraph("Executive Summary", heading2_style))
    story.append(Paragraph(f"<b>Total Issues Detected:</b> {audit_record['total_issues']}", normal_style))
    story.append(Spacer(1, 20))
    
    # Severity Breakdown Table
    data = [
        ['Severity', 'Count'],
        ['Critical', audit_record['critical_count']],
        ['High', audit_record['high_count']],
        ['Medium', audit_record['medium_count']],
        ['Low', audit_record['low_count']],
    ]
    
    table = Table(data, colWidths=[200, 100])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0,0), (1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
    ]))
    
    story.append(table)
    story.append(PageBreak())

    # ==========================================
    # PAGE 3+ - VIOLATIONS DETAILS
    # ==========================================
    story.append(Paragraph("Detailed Violations & Remediations", heading2_style))
    
    violations = audit_record.get('violations', [])
    
    if not violations:
        story.append(Paragraph("No accessibility violations were detected on this page. Excellent work!", normal_style))
    else:
        for i, v in enumerate(violations, 1):
            rule_name = str(v.get('rule', 'Unknown')).replace('_', ' ').title()
            severity = v.get('severity', 'Unknown')
            
            # Formatted Header
            story.append(Paragraph(f"<b>Issue #{i}: {rule_name}</b> (Severity: {severity})", styles['Heading3']))
            story.append(Paragraph(f"<b>Message:</b> {saxutils.escape(v.get('message', ''))}", normal_style))
            story.append(Spacer(1, 5))
            
            # Original HTML
            story.append(Paragraph("<b>Problematic Element:</b>", normal_style))
            escaped_element = saxutils.escape(v.get('element', ''))
            
            # Prevent reportlab XML parsing errors by stripping dangerous whitespace/newlines inside tags if needed
            # but saxutils.escape handles < and > which is enough for Paragraph to treat it as raw text.
            story.append(Paragraph(escaped_element, code_style))
            
            # AI Suggestion
            ai_sugg = v.get("ai_suggestion", "")
            if ai_sugg:
                story.append(Paragraph(f"★ <b>AI Suggestion:</b> {saxutils.escape(ai_sugg)}", ai_style))
            
            # Corrected HTML
            corrected = v.get("corrected_html", "")
            if corrected:
                story.append(Paragraph("<b>Suggested Fix (Corrected HTML):</b>", normal_style))
                story.append(Paragraph(saxutils.escape(corrected), code_style))
            
            story.append(Spacer(1, 20))

    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes
