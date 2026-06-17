from fastapi import APIRouter

router = APIRouter()


@router.get("/explain")
def explain():

    return {
        "message":
        "Explainability plots generated in outputs/plots/explainability"
    }