from pydantic import BaseModel


class QueryRequest(BaseModel):
    query: str
    model: str = "rf"


class ExportRequest(BaseModel):
    query: str
    prediction: float
    risk_level: str
    recommendations: list
    features: dict