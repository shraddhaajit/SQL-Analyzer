def get_risk_level(
    complexity_score
):

    if complexity_score < 20:
        return (
            1,
            "Low"
        )

    elif complexity_score < 40:
        return (
            2,
            "Moderate"
        )

    elif complexity_score < 60:
        return (
            3,
            "Medium"
        )

    elif complexity_score < 80:
        return (
            4,
            "High"
        )

    else:
        return (
            5,
            "Critical"
        )