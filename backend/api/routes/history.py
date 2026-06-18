from fastapi import APIRouter

from backend.history.history_manager import (
    get_history
)

router = APIRouter()


@router.get("/history")
def history():

    rows = get_history()

    results = []

    for row in rows:

        results.append(
            {
                "id": row[0],
                "query": row[1],
                "prediction": row[2],
                "risk_level": row[3],
                "created_at": row[4]
            }
        )

    return results