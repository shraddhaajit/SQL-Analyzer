# SQL Analyzer

SQL Analyzer is a machine learning-backed query optimization platform designed to predict PostgreSQL query execution times and identify query structure bottlenecks without executing queries in production. The system uses a combination of structural query features parsed via SQLGlot and plan cost estimates extracted from PostgreSQL EXPLAIN.

Every prediction is bounded to a known schema and row size, enabling reliable performance analysis, confidence intervals, local SHAP waterfall explanations, and rule-based optimization suggestions.

---

## Tech Stack

### Frontend
* Core: React, Vite, TypeScript
* Routing and Architecture: TanStack Start (using server functions as a Node-to-Python RPC bridge)
* Styling: Vanilla CSS (using Tailwind utilities for layout structure)
* Visualizations: Inline SVG charts (residual scatter plots, beeswarm plots, waterfalls, error histograms, learning curves, and complexity gauges)

### Backend
* Core: Python 3.10+
* Query Parsing: SQLGlot (for structural feature extraction and query rewrites)
* Database Driver: Psycopg2 (for explaining PostgreSQL queries)
* Log Database: SQLite (via history.db for query logging history)
* PDF Reports: ReportLab (for compiling analysis summaries)

### Machine Learning Pipeline
* Model Training and Evaluation: Scikit-Learn (Decision Tree, Random Forest Regressors)
* Gradient Boosting: XGBoost
* Explainability: SHAP (for local and global feature attribution analyses)

---

## Installation and Setup

### Prerequisites
* Python 3.10+
* Node.js 18+
* PostgreSQL 15+ (Required only for training new models; the app includes fallbacks for local analysis if PostgreSQL is offline)

### Step 1: Install Python Dependencies
Install the required Python packages from your command line:
```bash
pip install pandas numpy scikit-learn xgboost shap joblib psycopg2-binary reportlab sqlglot Faker tqdm matplotlib
```

### Step 2: Start the Web App
From the root directory, navigate to the frontend directory, install npm dependencies, and start the development server:
```bash
cd frontend
npm install
npm run dev
```

The application will launch and be accessible in the browser at:
http://localhost:8080

---

## Seeding PostgreSQL and Training Models

To train the machine learning models on real database timings:

### 1. Configure PostgreSQL Connection
Update database credentials in backend/database/db_connection.py to match your local PostgreSQL instance.

### 2. Populate the Tables
Set up the tables and seed 1.1 million rows with bulk batching:
```bash
# Set PYTHONPATH so python can resolve modules correctly
$env:PYTHONPATH="."

python backend/database/create_tables.py
python backend/database/populate_db.py
```

### 3. Create Supporting Indexes
Index foreign keys to accelerate the dataset query evaluations:
```bash
python -c "from backend.database.db_connection import get_connection; conn=get_connection(); cur=conn.cursor(); cur.execute('CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id); CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id); CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);'); conn.commit(); conn.close(); print('Indexes created!')"
```

### 4. Build Dataset and Train
Generate the evaluation queries, parse feature vectors, and train the regressors:
```bash
# 1. Generate query templates
python backend/dataset_generation/generate_queries.py

# 2. Build training dataset
python backend/dataset_generation/create_dataset.py

# 3. Train ML models
python -m ml_pipeline.train

# 4. Generate performance diagnostics outputs
python -m ml_pipeline.evaluate

# 5. Export SHAP global plots
python -m ml_pipeline.explain
```

---

## Dynamic Integration and Fallbacks

1. **Lightweight Fallbacks**: If model binaries (.joblib) are missing on startup, backend/main.py trains dummy models on a small synthetic dataset and saves them to backend/models/ to prevent runtime crashes.
2. **Offline Database Handling**: If PostgreSQL is offline, the backend parser gracefully catches the exception, switches the feature extraction to syntactic-only parsing, and routes predictions through syntactic-only models (_syn.joblib).
3. **Reactive UI Metrics**:
   * Dashboard: Table sizes and model MAE parameters are queried dynamically via the Python CLI.
   * Explainability Page: Features custom beeswarm rendering and waterfall components mapped directly to the local SHAP values calculated on the fly by the model in the backend.
   * SQL Editor: Prefills cache sessions and log histories to perform initial analyses immediately upon loading.
