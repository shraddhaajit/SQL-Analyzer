from fastapi import FastAPI

from fastapi.middleware.cors import (
    CORSMiddleware
)

from backend.api.routes.analyze import (
    router as analyze_router
)

from backend.api.routes.history import (
    router as history_router
)

from backend.api.routes.export import (
    router as export_router
)

app = FastAPI(
    title="SQL Analyzer API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
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

app.include_router(
    history_router
)

app.include_router(
    export_router
)