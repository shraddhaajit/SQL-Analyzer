from fastapi import APIRouter

from backend.api.schemas import (
    ExportRequest
)

from backend.reports.pdf_generator import (
    generate_report
)

router = APIRouter()


@router.post("/export")
def export_report(
    request: ExportRequest
):

    generate_report(
    query=request.query,
    prediction=request.prediction,
    risk_level=request.risk_level,
    recommendations=request.recommendations,
    features={}
)

    return {
        "message":
        "PDF report generated successfully"
    }