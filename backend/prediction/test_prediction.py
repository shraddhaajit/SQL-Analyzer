from backend.prediction.model_loader import (
    load_model
)

from backend.prediction.predictor import (
    predict_execution_time
)

model = load_model(
    "ml_pipeline/models/rf_model.joblib"
)

sample = [
    5, 4, 1, 1,
    8, 1, 1, 3,
    2, 1, 3, 4,
    1, 1, 1200, 3,
    500000, 50000, 1000,
    0, 12, 95
]

prediction = predict_execution_time(
    model,
    sample
)

print(
    "Prediction:",
    prediction
)