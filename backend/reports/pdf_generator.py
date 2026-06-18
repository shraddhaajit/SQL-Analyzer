from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from datetime import datetime

def generate_report(
    query,
    prediction,
    risk_level,
    recommendations,
    features=None,
    model_predictions=None,
    prediction_interval=None,
    output_file="report.pdf"
):
    # Setup document
    doc = SimpleDocTemplate(
        output_file,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0f172a'), # Slate-900
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748b'), # Slate-500
        spaceAfter=20
    )
    
    h1_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#334155') # Slate-700
    )
    
    code_style = ParagraphStyle(
        'SQLQueryCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=5,
        spaceAfter=5
    )
    
    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        textColor=colors.HexColor('#475569')
    )

    content = []

    # --- Header & Scope ---
    content.append(Paragraph("SQL Query Performance Analysis Report", title_style))
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    scope_str = (
        f"<b>Generated:</b> {timestamp} | <b>Target Environment:</b> PostgreSQL 15 | "
        "<b>Scope Bounded Schema:</b> customers (100k), orders (500k), products (10k), employees (5k), payments (500k)"
    )
    content.append(Paragraph(scope_str, subtitle_style))
    content.append(Spacer(1, 5))

    # --- Section 1: Query ---
    content.append(Paragraph("Query Text", h1_style))
    # Render query inside a padded gray box
    query_p = Paragraph(query.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)
    query_table = Table([[query_p]], colWidths=[530])
    query_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')), # Slate-50
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')), # Slate-200
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    content.append(query_table)
    content.append(Spacer(1, 10))

    # --- Section 2: Prediction Summary ---
    content.append(Paragraph("Execution Time Prediction", h1_style))
    
    risk_color = '#10b981' # Green
    if risk_level.lower() == 'med' or risk_level.lower() == 'medium':
        risk_color = '#f59e0b' # Yellow
    elif risk_level.lower() == 'high' or risk_level.lower() == 'crit' or risk_level.lower() == 'critical':
        risk_color = '#ef4444' # Red
        
    pred_sec = prediction / 1000.0
    
    interval_str = "N/A"
    if prediction_interval:
        interval_str = f"{prediction_interval['lower']:.2f}s — {prediction_interval['upper']:.2f}s"
        
    summary_data = [
        [Paragraph("Primary Model Prediction (Random Forest)", meta_label_style), 
         Paragraph(f"<b>{prediction:.2f} ms</b> ({pred_sec:.2f} seconds)", body_style)],
        [Paragraph("Risk Classification", meta_label_style), 
         Paragraph(f"<font color='{risk_color}'><b>{risk_level.upper()} RISK</b></font>", body_style)],
        [Paragraph("Confidence Interval (1.5σ range)", meta_label_style), 
         Paragraph(interval_str, body_style)]
    ]
    
    summary_table = Table(summary_data, colWidths=[240, 290])
    summary_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    content.append(summary_table)
    content.append(Spacer(1, 15))

    # --- Section 3: Model Comparison & Ablation ---
    if model_predictions:
        content.append(Paragraph("Multi-Model Predictions", h1_style))
        comparison_data = [
            [Paragraph("<b>Model</b>", meta_label_style), Paragraph("<b>Predicted Time (ms)</b>", meta_label_style), Paragraph("<b>Seconds</b>", meta_label_style)]
        ]
        for m_name, m_pred in model_predictions.items():
            comparison_data.append([
                Paragraph(m_name, body_style),
                Paragraph(f"{m_pred:.2f} ms", body_style),
                Paragraph(f"{m_pred/1000.0:.2f}s", body_style)
            ])
        comparison_table = Table(comparison_data, colWidths=[200, 160, 170])
        comparison_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
        ]))
        content.append(comparison_table)
        content.append(Spacer(1, 15))

    # --- Section 4: Feature Vector Table ---
    if features:
        content.append(Paragraph("Extracted Axiom Features (22 Features)", h1_style))
        
        # We split the 22 features into two side-by-side columns to save space
        feat_keys = list(features.keys())
        half_idx = (len(feat_keys) + 1) // 2
        
        col1_keys = feat_keys[:half_idx]
        col2_keys = feat_keys[half_idx:]
        
        feat_rows = []
        for i in range(half_idx):
            k1 = col1_keys[i]
            v1 = features[k1]
            # format values nicely
            v1_str = f"{v1:.2f}" if isinstance(v1, float) else str(v1)
            
            k2 = col2_keys[i] if i < len(col2_keys) else ""
            v2 = features[k2] if i < len(col2_keys) else ""
            v2_str = f"{v2:.2f}" if isinstance(v2, float) else str(v2) if k2 else ""
            
            feat_rows.append([
                Paragraph(f"<b>{k1}</b>", body_style), Paragraph(v1_str, body_style),
                Paragraph(f"<b>{k2}</b>" if k2 else "", body_style), Paragraph(v2_str, body_style)
            ])
            
        feat_table = Table(feat_rows, colWidths=[180, 80, 190, 80])
        feat_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f1f5f9')),
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f8fafc')),
            ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#f8fafc')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
        ]))
        content.append(feat_table)
        content.append(Spacer(1, 15))

    # --- Section 5: Recommendations ---
    if recommendations:
        rec_elements = []
        rec_elements.append(Paragraph("Advisor Optimization Suggestions", h1_style))
        
        for idx, item in enumerate(recommendations):
            rec_color = '#ef4444' if item['impact'].lower() in ['high', 'crit', 'critical'] else '#f59e0b'
            
            rec_box = [
                Paragraph(f"<b>Suggestion {idx+1}: {item['rule']}</b> | Impact: <font color='{rec_color}'><b>{item['impact'].upper()}</b></font>", meta_label_style),
                Spacer(1, 3),
                Paragraph(f"<b>Problem:</b> {item['problem']}", body_style),
                Spacer(1, 3),
                Paragraph(f"<b>Recommendation:</b> {item['recommendation']}", body_style),
            ]
            
            if 'before' in item and 'after' in item:
                # Add tiny query rewrite preview block inside the pdf
                before_p = Paragraph(item['before'].replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)
                after_p = Paragraph(item['after'].replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)
                
                code_subtable = Table([[before_p, after_p]], colWidths=[250, 250])
                code_subtable.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (0,0), colors.HexColor('#fef2f2')), # red-50
                    ('BACKGROUND', (1,0), (1,0), colors.HexColor('#f0fdf4')), # green-50
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                    ('TOPPADDING', (0,0), (-1,-1), 6),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ]))
                rec_box.append(Spacer(1, 4))
                rec_box.append(code_subtable)
                
            rec_box.append(Spacer(1, 8))
            rec_elements.append(KeepTogether(rec_box))
            
        content.extend(rec_elements)

    # --- Footer Callback function ---
    def add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica-Oblique', 8)
        canvas.setFillColor(colors.HexColor('#64748b'))
        
        # Scope disclaimer footer on every page
        disclaimer = (
            "Disclaimer: Predictions represent relative performance estimates bounded to local schema specifications "
            "and PostgreSQL 15 configuration. Actual values may vary under concurrent transactions or staging variables."
        )
        canvas.drawString(40, 25, disclaimer)
        canvas.drawRightString(doc.pagesize[0] - 40, 25, f"Page {doc.page}")
        canvas.restoreState()

    # Build the document
    doc.build(content, onFirstPage=add_footer, onLaterPages=add_footer)