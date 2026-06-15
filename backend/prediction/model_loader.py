import joblib
import os
def load_model(model_path):

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model not found: {model_path}"
        )

    return joblib.load(model_path)