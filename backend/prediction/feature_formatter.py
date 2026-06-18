import pandas as pd

from backend.prediction.feature_order import (
    FEATURE_ORDER
)


def prepare_features(
    features
):

    row = []

    for feature in FEATURE_ORDER:

        row.append(
            features[feature]
        )

    return pd.DataFrame(
        [row],
        columns=FEATURE_ORDER
    )