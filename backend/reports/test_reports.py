from backend.reports.pdf_generator import (
    generate_report
)

generate_report(
    query="SELECT * FROM customers",
    prediction=12.5,
    risk_level="Low",
    recommendations=[
        {
            "rule":
            "SELECT * Detected"
        }
    ]
)