import numpy as np

def get_rf_confidence_interval(rf_model, feature_vector_2d, prediction_log):
    """
    Computes a ±1.5 standard deviation interval of individual decision tree predictions
    within a Random Forest model, and performs inverse log transformation to ms space.
    """
    try:
        # Predict using each individual decision tree in the ensemble
        individual_preds_log = [
            estimator.predict(feature_vector_2d)[0] 
            for estimator in rf_model.estimators_
        ]
        
        std_dev = np.std(individual_preds_log)
        
        lower_log = prediction_log - 1.5 * std_dev
        upper_log = prediction_log + 1.5 * std_dev
        
        lower = np.expm1(lower_log)
        upper = np.expm1(upper_log)
        
        # Ensure values don't go negative
        lower = max(0.0, lower)
        upper = max(0.0, upper)
        
        return {
            "lower": round(lower, 4),
            "upper": round(upper, 4)
        }
    except Exception as e:
        print(f"Confidence interval extraction failed: {e}. Using fallback.")
        # Fallback to a mock boundary
        pred = np.expm1(prediction_log)
        return {
            "lower": round(max(0.0, pred * 0.9), 4),
            "upper": round(pred * 1.1, 4)
        }