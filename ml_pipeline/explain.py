import shap
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os
from sklearn.tree import plot_tree
from sklearn.tree import export_graphviz
from train import preprocess_data

def generate_shap_plots():
    print("Generating complete SHAP and Explainability plots...")
    os.makedirs('outputs/plots/explainability', exist_ok=True)
    df = pd.read_csv('../dataset.csv')
    
    _, X_test, _, _, features = preprocess_data(df)
    
    # Use a small sample to speed up SHAP generation
    X_sample = X_test.sample(100, random_state=42)
    single_query = X_sample.iloc[[0]] # For local explanations
    
    # Load Models
    xgb_model = joblib.load('models/xgb_model.joblib')
    dt_model = joblib.load('models/dt_model.joblib')
    rf_model = joblib.load('models/rf_model.joblib')
    
    # 1. SHAP GLOBAL EXPLANATIONS (XGBoost)
    explainer = shap.TreeExplainer(xgb_model)
    shap_values = explainer(X_sample)
    
    # Beeswarm plot
    plt.figure(figsize=(10, 6))
    shap.plots.beeswarm(shap_values, show=False)
    plt.savefig('outputs/plots/explainability/shap_beeswarm.png', bbox_inches='tight')
    plt.close()
    
    # Bar plot
    plt.figure(figsize=(10, 6))
    shap.plots.bar(shap_values, show=False)
    plt.savefig('outputs/plots/explainability/shap_bar.png', bbox_inches='tight')
    plt.close()
    
    # Dependence plot (using top feature, usually planner_total_cost or estimated_rows)
    # We will just use the first feature in the dataset for demonstration
    plt.figure(figsize=(10, 6))
    shap.dependence_plot(0, shap_values.values, X_sample, show=False)
    plt.savefig('outputs/plots/explainability/shap_dependence.png', bbox_inches='tight')
    plt.close()

    # 2. SHAP LOCAL EXPLANATIONS (Single Query)
    single_shap = explainer(single_query)
    
    # Waterfall plot
    plt.figure(figsize=(10, 6))
    shap.plots.waterfall(single_shap[0], show=False)
    plt.savefig('outputs/plots/explainability/shap_waterfall_local.png', bbox_inches='tight')
    plt.close()
    
    # Force plot
    force_plot = shap.force_plot(explainer.expected_value, single_shap.values[0], single_query.iloc[0], matplotlib=True, show=False)
    plt.savefig('outputs/plots/explainability/shap_force_local.png', bbox_inches='tight')
    plt.close()
    
    # 3. DECISION TREE PATH VISUALIZATION
    tree = dt_model
    plt.figure(figsize=(20, 10))
    plot_tree(tree, feature_names=features, filled=True, rounded=True, max_depth=3, fontsize=10)
    plt.savefig("outputs/plots/explainability/decision_tree_path.png", bbox_inches='tight')
    plt.close()
    
    # 4. FEATURE IMPORTANCE COMPARISON
    dt_imp = tree.feature_importances_
    # RF Random search best estimator
    rf_imp = rf_model.feature_importances_
    # XGB best estimator
    xgb_imp = xgb_model.feature_importances_
    
    imp_df = pd.DataFrame({
        'Feature': features,
        'DT': dt_imp,
        'RF': rf_imp,
        'XGB': xgb_imp
    }).set_index('Feature')
    
    # Sort by RF importance
    imp_df = imp_df.sort_values(by='RF', ascending=True).tail(10) # Top 10
    
    imp_df.plot(kind='barh', figsize=(12, 8))
    plt.title('Feature Importance Comparison (Top 10)')
    plt.xlabel('Relative Importance')
    plt.savefig('outputs/plots/explainability/feature_importance_comparison.png', bbox_inches='tight')
    plt.close()

    print("All Explainability plots generated in outputs/plots/explainability/")

if __name__ == "__main__":
    generate_shap_plots()
