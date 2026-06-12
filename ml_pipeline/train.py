import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split, GridSearchCV, RandomizedSearchCV
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb
import os

def preprocess_data(df):
    # Outlier handling: cap at 99th percentile
    p99 = df['median_execution_time_ms'].quantile(0.99)
    df.loc[df['median_execution_time_ms'] > p99, 'median_execution_time_ms'] = p99
    
    # Features & Target
    features = [c for c in df.columns if c not in ['median_execution_time_ms', 'tier']]
    X = df[features]
    y = np.log1p(df['median_execution_time_ms']) # Log transform of target
    
    # Train/test split, stratified by tier
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=df['tier'], random_state=42
    )
    
    return X_train, X_test, y_train, y_test, features

def train_dt(X_train, y_train):
    print("Training Decision Tree...")
    dt = DecisionTreeRegressor(random_state=42)
    params = {
        'max_depth': [5, 8, 10, 12],
        'min_samples_leaf': [5, 10, 20],
        'max_features': ['sqrt', 'log2', None]
    }
    grid = GridSearchCV(dt, params, cv=3, scoring='neg_mean_absolute_error', n_jobs=-1)
    grid.fit(X_train, y_train)
    return grid.best_estimator_

def train_rf(X_train, y_train):
    print("Training Random Forest...")
    rf = RandomForestRegressor(random_state=42)
    params = {
        'n_estimators': [50, 100], 
        'max_depth': [10, 15, None],
        'min_samples_leaf': [2, 5],
        'max_features': ['sqrt', 'log2']
    }
    search = RandomizedSearchCV(rf, params, cv=3, scoring='neg_mean_absolute_error', n_iter=5, random_state=42, n_jobs=-1)
    search.fit(X_train, y_train)
    return search.best_estimator_

def train_xgb(X_train, y_train):
    print("Training XGBoost...")
    model = xgb.XGBRegressor(random_state=42, objective='reg:squarederror')
    params = {
        'learning_rate': [0.05, 0.1, 0.2],
        'n_estimators': [50, 100],
        'max_depth': [3, 5, 7],
        'subsample': [0.8, 1.0],
        'colsample_bytree': [0.8, 1.0]
    }
    search = RandomizedSearchCV(model, params, cv=3, scoring='neg_mean_absolute_error', n_iter=5, random_state=42, n_jobs=-1)
    search.fit(X_train, y_train)
    return search.best_estimator_

if __name__ == "__main__":
    print("Loading data...")
    df = pd.read_csv('mock_dataset.csv')
    X_train, X_test, y_train, y_test, features = preprocess_data(df)
    
    os.makedirs('models', exist_ok=True)
    
    dt_model = train_dt(X_train, y_train)
    joblib.dump(dt_model, 'models/dt_model.joblib')
    
    rf_model = train_rf(X_train, y_train)
    joblib.dump(rf_model, 'models/rf_model.joblib')
    
    xgb_model = train_xgb(X_train, y_train)
    joblib.dump(xgb_model, 'models/xgb_model.joblib')
    
    # Syntactic only models for ablation study (Features 1-16)
    syntactic_features = features[:16]
    X_train_syn = X_train[syntactic_features]
    
    print("Training Ablation Models (Syntactic only)...")
    dt_syn = train_dt(X_train_syn, y_train)
    joblib.dump(dt_syn, 'models/dt_model_syn.joblib')
    
    rf_syn = train_rf(X_train_syn, y_train)
    joblib.dump(rf_syn, 'models/rf_model_syn.joblib')
    
    xgb_syn = train_xgb(X_train_syn, y_train)
    joblib.dump(xgb_syn, 'models/xgb_model_syn.joblib')
    
    print("All models trained and exported to models/ directory.")
