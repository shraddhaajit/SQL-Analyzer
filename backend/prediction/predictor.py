import numpy as np


def predict_execution_time(
    model,
    feature_vector
):

    prediction = model.predict(
    feature_vector
)[0]

    prediction = np.expm1(
        prediction
    )

    return round(
        prediction,
        4
    )