from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer
)

from reportlab.lib.styles import (
    getSampleStyleSheet
)


def generate_report(
    query,
    prediction,
    risk_level,
    recommendations,
    output_file="report.pdf"
):

    doc = SimpleDocTemplate(
        output_file
    )

    styles = getSampleStyleSheet()

    content = []

    content.append(
        Paragraph(
            "SQL Query Analysis Report",
            styles["Title"]
        )
    )

    content.append(
        Spacer(1, 12)
    )

    content.append(
        Paragraph(
            f"<b>Query:</b> {query}",
            styles["BodyText"]
        )
    )

    content.append(
        Paragraph(
            f"<b>Prediction:</b> {prediction} ms",
            styles["BodyText"]
        )
    )

    content.append(
        Paragraph(
            f"<b>Risk Level:</b> {risk_level}",
            styles["BodyText"]
        )
    )

    content.append(
        Spacer(1, 12)
    )

    content.append(
        Paragraph(
            "Recommendations",
            styles["Heading2"]
        )
    )

    for item in recommendations:

        content.append(
            Paragraph(
                f"- {item['rule']}",
                styles["BodyText"]
            )
        )

    doc.build(content)

    print(
        f"PDF generated: {output_file}"
    )