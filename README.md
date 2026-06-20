# SQL Analyzer

SQL Analyzer is a machine learning-backed query optimization platform that predicts PostgreSQL execution times and identifies bottlenecks without running queries in production. It extracts structural features via SQLGlot and planner costs via PostgreSQL EXPLAIN, feeding them into trained predictive models (Random Forest, XGBoost, Decision Trees).

By leveraging artificial intelligence to replace traditional execution, the system can instantly generate accurate execution times, confidence intervals, and local SHAP explanations that mathematically prove exactly *why* a query is slow—all without touching the live database.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, Vite, TypeScript, TanStack Start, Vanilla CSS |
| **Backend** | Python 3.10+, SQLGlot, Psycopg2, SQLite, ReportLab |
| **ML Pipeline** | Scikit-Learn (Random Forest, Decision Tree), XGBoost, SHAP |

---

## Installation and Setup

**Requirements**: Python 3.10+, Node.js 18+, PostgreSQL 15+ (required only for model training)

1. **Install Python Dependencies**
```bash
pip install pandas numpy scikit-learn xgboost shap joblib psycopg2-binary reportlab sqlglot Faker tqdm matplotlib
```

2. **Start Web App**
```bash
cd frontend
npm install
npm run dev
```
Accessible at `http://localhost:8080`

---

## Training Models (Optional)

Update credentials in `backend/database/db_connection.py`, then run:

```bash
$env:PYTHONPATH="."
# 1. Seed database & create indexes
python backend/database/create_tables.py
python backend/database/populate_db.py

# 2. Build dataset
python backend/dataset_generation/generate_queries.py
python backend/dataset_generation/create_dataset.py

# 3. Train, evaluate, and extract SHAP plots
python -m ml_pipeline.train
python -m ml_pipeline.evaluate
python -m ml_pipeline.explain
```

---

## Architecture Fallbacks

1. **Lightweight Starts**: If models are missing, `main.py` trains fast dummy models to prevent runtime crashes.
2. **Offline Mode**: If PostgreSQL is offline, the app dynamically falls back to syntactic-only parsing and backup `_syn.joblib` models.
3. **Reactive UI**: The dashboard queries live MAE metrics via the Python RPC, and the Explainability page natively renders SHAP waterfalls calculated on-the-fly.
