from fastapi import FastAPI

from backend.api.routes.analyze import (
    router as analyze_router
)
from backend.api.routes.export import (
    router as export_router
)
app = FastAPI(
    title="SQL Analyzer API"
)


@app.get("/")
def home():

    return {
        "message":
        "SQL Analyzer Backend Running"
    }


app.include_router(
    analyze_router
)
from backend.api.routes.history import (
    router as history_router
)
app.include_router(
    analyze_router
)
app.include_router(
    history_router
)
app.include_router(
    analyze_router
)

app.include_router(
    history_router
)
app.include_router(
    export_router
)