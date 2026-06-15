from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak
)

from reportlab.lib.styles import (
    getSampleStyleSheet
)

from datetime import datetime


from datetime import datetime


def generate_report(
    query,
    prediction,
    risk_level,
    recommendations,
    features=None,
    output_file="report.pdf"
):

    doc = SimpleDocTemplate(
        output_file
    )

    styles = getSampleStyleSheet()

    content = []

    content.append(
        Paragraph(
            "SQL Query Performance Analysis Report",
            styles["Title"]
        )
    )

    content.append(
        Paragraph(
            f"Generated: {datetime.now()}",
            styles["BodyText"]
        )
    )

    content.append(
        Spacer(1, 15)
    )

    content.append(
        Paragraph(
            "Query Information",
            styles["Heading1"]
        )
    )

    content.append(
        Paragraph(
            f"<b>Query:</b> {query}",
            styles["BodyText"]
        )
    )

    content.append(
        Spacer(1, 12)
    )

    content.append(
        Paragraph(
            "Prediction Summary",
            styles["Heading1"]
        )
    )

    content.append(
        Paragraph(
            f"<b>Predicted Execution Time:</b> {prediction} ms",
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

    if features:

        content.append(
            Paragraph(
                "Feature Summary",
                styles["Heading1"]
            )
        )

        important_features = [
            "table_count",
            "join_count",
            "subquery_count",
            "planner_total_cost",
            "complexity_score"
        ]

        for feature in important_features:

            if feature in features:

                content.append(
                    Paragraph(
                        f"<b>{feature}</b>: {features[feature]}",
                        styles["BodyText"]
                    )
                )

        content.append(
            Spacer(1, 12)
        )

    content.append(
        Paragraph(
            "Optimization Recommendations",
            styles["Heading1"]
        )
    )

    for item in recommendations:

        content.append(
            Paragraph(
                f"<b>{item['rule']}</b>",
                styles["BodyText"]
            )
        )

        if "impact" in item:

            content.append(
                Paragraph(
                    f"Impact: {item['impact']}",
                    styles["BodyText"]
                )
            )

        if "recommendation" in item:

            content.append(
                Paragraph(
                    f"Recommendation: {item['recommendation']}",
                    styles["BodyText"]
                )
            )

        content.append(
            Spacer(1, 8)
        )

    doc.build(content)

    print(
        f"PDF generated: {output_file}"
    )