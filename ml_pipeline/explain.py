import shap
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os
from sklearn.tree import plot_tree
from sklearn.tree import export_graphviz
from ml_pipeline.train import preprocess_data

def generate_shap_plots():
    print("Generating complete SHAP and Explainability plots...")
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(project_root, 'outputs/plots/explainability')
    os.makedirs(output_dir, exist_ok=True)
    
    dataset_path = os.path.join(project_root, 'dataset.csv')
    df = pd.read_csv(dataset_path)
    
    _, X_test, _, _, features = preprocess_data(df)
    
    # Use a small sample to speed up SHAP generation
    X_sample = X_test.sample(100, random_state=42)
    single_query = X_sample.iloc[[0]] # For local explanations
    
    # Load Models
    models_dir = os.path.join(project_root, 'backend', 'models')
    xgb_model = joblib.load(os.path.join(models_dir, 'xgb_model.joblib'))
    dt_model = joblib.load(os.path.join(models_dir, 'dt_model.joblib'))
    rf_model = joblib.load(os.path.join(models_dir, 'rf_model.joblib'))
    
    # 1. SHAP GLOBAL EXPLANATIONS (XGBoost)
    explainer = shap.TreeExplainer(xgb_model)
    shap_values = explainer(X_sample)
    
    # Beeswarm plot
    plt.figure(figsize=(10, 6))
    shap.plots.beeswarm(shap_values, show=False)
    plt.savefig(os.path.join(output_dir, 'shap_beeswarm.png'), bbox_inches='tight')
    plt.close()
    
    # Bar plot
    plt.figure(figsize=(10, 6))
    shap.plots.bar(shap_values, show=False)
    plt.savefig(os.path.join(output_dir, 'shap_bar.png'), bbox_inches='tight')
    plt.close()
    
    # Dependence plot (using top feature, usually planner_total_cost or estimated_rows)
    plt.figure(figsize=(10, 6))
    shap.dependence_plot(0, shap_values.values, X_sample, show=False)
    plt.savefig(os.path.join(output_dir, 'shap_dependence.png'), bbox_inches='tight')
    plt.close()

    # 2. SHAP LOCAL EXPLANATIONS (Single Query)
    single_shap = explainer(single_query)
    
    # Waterfall plot
    plt.figure(figsize=(10, 6))
    shap.plots.waterfall(single_shap[0], show=False)
    plt.savefig(os.path.join(output_dir, 'shap_waterfall_local.png'), bbox_inches='tight')
    plt.close()
    
    # Force plot
    force_plot = shap.force_plot(explainer.expected_value, single_shap.values[0], single_query.iloc[0], matplotlib=True, show=False)
    plt.savefig(os.path.join(output_dir, 'shap_force_local.png'), bbox_inches='tight')
    plt.close()
    
    # 3. DECISION TREE PATH VISUALIZATION
    tree = dt_model
    plt.figure(figsize=(20, 10))
    plot_tree(tree, feature_names=features, filled=True, rounded=True, max_depth=3, fontsize=10)
    plt.savefig(os.path.join(output_dir, 'decision_tree_path.png'), bbox_inches='tight')
    plt.close()
    
    # 4. FEATURE IMPORTANCE COMPARISON
    dt_imp = tree.feature_importances_
    rf_imp = rf_model.feature_importances_
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
    plt.savefig(os.path.join(output_dir, 'feature_importance_comparison.png'), bbox_inches='tight')
    plt.close()

    print(f"All Explainability plots generated in {output_dir}")

if __name__ == "__main__":
    generate_shap_plots()
