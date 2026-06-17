import pandas as pd
import numpy as np
import joblib
import os
import matplotlib.pyplot as plt
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, median_absolute_error
from sklearn.model_selection import learning_curve
from train import preprocess_data

def evaluate_models():
    print("Evaluating models...")
    df = pd.read_csv('../dataset.csv')
    X_train, X_test, y_train_log, y_test_log, features = preprocess_data(df)
    
    y_test = np.expm1(y_test_log) # inverse log
    y_train = np.expm1(y_train_log)
    
    models = {
        'Decision Tree': joblib.load('models/dt_model.joblib'),
        'Random Forest': joblib.load('models/rf_model.joblib'),
        'XGBoost': joblib.load('models/xgb_model.joblib')
    }
    
    syn_models = {
        'Decision Tree': joblib.load('models/dt_model_syn.joblib'),
        'Random Forest': joblib.load('models/rf_model_syn.joblib'),
        'XGBoost': joblib.load('models/xgb_model_syn.joblib')
    }
    
    results = []
    os.makedirs('outputs/plots/evaluation', exist_ok=True)
    
    # Track errors for breakdown
    test_tiers = df.loc[X_test.index, 'tier']
    
    # Full models
    for name, model in models.items():
        preds_log = model.predict(X_test)
        preds = np.expm1(preds_log)
        
        # Core Metrics
        mae = mean_absolute_error(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        r2 = r2_score(y_test, preds)
        medae = median_absolute_error(y_test, preds)
        results.append({'Model': name, 'Features': 'Full (22)', 'MAE': mae, 'RMSE': rmse, 'R2': r2, 'MedAE': medae})
        
        # Residual Analysis Plot
        plt.figure(figsize=(8, 8))
        plt.scatter(y_test, preds, alpha=0.5)
        plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--')
        plt.xlabel('Actual Execution Time')
        plt.ylabel('Predicted Execution Time')
        plt.title(f'{name} - Residual Analysis')
        plt.savefig(f'outputs/plots/evaluation/residual_{name.replace(" ", "_")}.png')
        plt.close()
        
        # Error Distribution Analysis
        errors = preds - y_test
        plt.figure(figsize=(8, 6))
        plt.hist(errors, bins=50, edgecolor='k')
        plt.xlabel('Prediction Error (Predicted - Actual)')
        plt.ylabel('Frequency')
        plt.title(f'{name} - Error Distribution')
        plt.savefig(f'outputs/plots/evaluation/error_dist_{name.replace(" ", "_")}.png')
        plt.close()
        
        # Error Breakdown by Complexity Tier
        tier_maes = []
        for tier in range(1, 6):
            tier_mask = (test_tiers == tier)
            if tier_mask.sum() > 0:
                tier_mae = mean_absolute_error(y_test[tier_mask], preds[tier_mask])
                tier_maes.append(tier_mae)
            else:
                tier_maes.append(0)
        
        plt.figure(figsize=(8, 6))
        plt.bar(range(1, 6), tier_maes)
        plt.xlabel('Complexity Tier')
        plt.ylabel('Mean Absolute Error (ms)')
        plt.title(f'{name} - Error by Complexity Tier')
        plt.savefig(f'outputs/plots/evaluation/tier_breakdown_{name.replace(" ", "_")}.png')
        plt.close()
        
        # Learning Curves
        # We run this on XGBoost as representative to save time, or all if requested.
        if name == 'XGBoost':
            train_sizes, train_scores, test_scores = learning_curve(
                model, X_train, y_train_log, cv=3, scoring='neg_mean_absolute_error',
                n_jobs=-1, train_sizes=np.linspace(0.1, 1.0, 5)
            )
            train_mean = -np.mean(train_scores, axis=1)
            test_mean = -np.mean(test_scores, axis=1)
            plt.figure(figsize=(8, 6))
            plt.plot(train_sizes, train_mean, label='Training error')
            plt.plot(train_sizes, test_mean, label='Cross-validation error')
            plt.xlabel('Training Set Size')
            plt.ylabel('Negative MAE (log space)')
            plt.title('Learning Curve - XGBoost')
            plt.legend()
            plt.savefig('outputs/plots/evaluation/learning_curve_XGBoost.png')
            plt.close()

    # Syntactic models (Ablation Study)
    X_test_syn = X_test[features[:16]]
    for name, model in syn_models.items():
        preds_log = model.predict(X_test_syn)
        preds = np.expm1(preds_log)
        mae = mean_absolute_error(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        r2 = r2_score(y_test, preds)
        medae = median_absolute_error(y_test, preds)
        results.append({'Model': name, 'Features': 'Syntactic Only (16)', 'MAE': mae, 'RMSE': rmse, 'R2': r2, 'MedAE': medae})
        
    res_df = pd.DataFrame(results)
    print("\n--- Evaluation Results ---")
    print(res_df.to_string(index=False))
    
    res_df.to_csv('outputs/evaluation_metrics_ablation.csv', index=False)
    print("\nAll evaluation plots and metrics saved to outputs/plots/evaluation/")
    
if __name__ == "__main__":
    evaluate_models()
