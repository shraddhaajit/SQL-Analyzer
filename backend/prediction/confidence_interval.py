def get_confidence_interval(
    prediction
):

    lower = prediction * 0.9
    upper = prediction * 1.1

    return {
        "lower": round(lower, 2),
        "upper": round(upper, 2)
    }