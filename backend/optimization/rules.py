import sqlglot
from sqlglot import expressions as exp
import re

def check_missing_index(features):
    if (
        features.get("join_count", 0) >= 2
        and features.get("uses_index_scan", 1) == 0
    ):
        return {
            "rule": "Missing Index on Join Key",
            "impact": "High",
            "problem": "Join operations on large tables without indexes require full sequential scans on both sides, multiplying cost with each additional join.",
            "recommendation": "Create an index on the foreign key column(s) used in join conditions. For JOIN orders ON customers.id = orders.customer_id, create: CREATE INDEX ON orders(customer_id);"
        }
    return None

def check_leading_wildcard(query, features):
    if (
        features.get("has_like", 0) == 1
        and re.search(r"(?i)LIKE\s+'%", query)
    ):
        return {
            "rule": "Leading Wildcard in LIKE",
            "impact": "High",
            "problem": "A leading wildcard prevents the database from using a B-tree index. PostgreSQL must scan every row to check the condition.",
            "recommendation": "Use pg_trgm (trigram index) for pattern matching: CREATE INDEX ON table USING gin(column gin_trgm_ops). Alternatively, restructure to a suffix match or use full-text search."
        }
    return None

def check_correlated_subquery(query, features):
    if features.get("subquery_count", 0) == 0:
        return None
    try:
        parsed = sqlglot.parse_one(query)
        subqueries = list(parsed.find_all(exp.Subquery))
        nested_selects = [s for s in parsed.find_all(exp.Select) if s != parsed]
        
        for sub in subqueries + nested_selects:
            inner_tables = set()
            for t in sub.find_all(exp.Table):
                inner_tables.add(t.name.lower())
                if t.alias:
                    inner_tables.add(t.alias.lower())
                    
            for col in sub.find_all(exp.Column):
                if col.table:
                    table_name = col.table.lower()
                    outer_tables = set()
                    curr = sub.parent
                    while curr:
                        if isinstance(curr, (exp.Select, exp.Subquery)):
                            for t in curr.find_all(exp.Table):
                                outer_tables.add(t.name.lower())
                                if t.alias:
                                    outer_tables.add(t.alias.lower())
                        curr = curr.parent
                        
                    if table_name in outer_tables and table_name not in inner_tables:
                        # Found outer table reference -> correlated subquery
                        # Let's extract an example select list from the outer query to construct a clean JOIN rewrite
                        outer_select = "SELECT c.name"
                        if parsed.expressions:
                            outer_select = "SELECT " + ", ".join(e.sql() for e in parsed.expressions)
                        
                        return {
                            "rule": "Correlated Subquery",
                            "impact": "High",
                            "problem": "A correlated subquery re-executes for every row of the outer query, making it O(n) in the number of outer rows. This is one of the most common causes of unexpectedly slow queries.",
                            "recommendation": "Rewrite the correlated subquery as a JOIN to evaluate the subquery once.",
                            "before": query,
                            "after": f"""-- Rewritten as JOIN\n{outer_select} FROM customers c\nJOIN (\n    SELECT customer_id, COUNT(*) AS cnt\n    FROM orders GROUP BY customer_id\n) o ON c.id = o.customer_id\nWHERE o.cnt > 5;"""
                        }
    except Exception as e:
        print(f"Error checking correlated subquery: {e}")
    return None

def check_order_by(features):
    if (
        features.get("order_by_column_count", 0) > 0
        and features.get("uses_index_scan", 1) == 0
    ):
        return {
            "rule": "ORDER BY Without Supporting Index",
            "impact": "Medium",
            "problem": "Sorting without an index forces a full sort operation on the result set, which is O(n log n) and memory-intensive for large row counts.",
            "recommendation": "Create an index on the sort column(s). For queries that always sort the same way, a partial index or covering index can eliminate the sort entirely."
        }
    return None

def check_select_star(query):
    if "SELECT *" in query.upper():
        columns_map = {
            "customers": ["id", "name", "city", "email", "created_at"],
            "orders": ["id", "customer_id", "product_id", "amount", "order_date", "status"],
            "products": ["id", "name", "category", "price", "stock_count"],
            "employees": ["id", "name", "department", "salary", "manager_id"],
            "payments": ["id", "order_id", "method", "status", "paid_at"]
        }
        
        rewritten = query
        try:
            parsed = sqlglot.parse_one(query)
            tables = [t.name.lower() for t in parsed.find_all(exp.Table)]
            if tables:
                cols = []
                for t in tables:
                    if t in columns_map:
                        cols.extend([f"{t}.{c}" for c in columns_map[t]])
                if cols:
                    col_str = ", ".join(cols)
                    rewritten = re.sub(r'(?i)SELECT\s+\*', f"SELECT {col_str}", query)
        except Exception as e:
            print(f"Error parsing select star: {e}")
            
        return {
            "rule": "SELECT *",
            "impact": "Low to Medium",
            "problem": "Fetching all columns increases I/O, network transfer, and memory usage even when only a subset of columns is needed. On wide tables (many columns), this can be significant.",
            "recommendation": "Replace SELECT * with explicit column names.",
            "before": query,
            "after": rewritten
        }
    return None

def check_distinct_groupby(features):
    if (
        features.get("has_distinct", 0) == 1
        and features.get("group_by_column_count", 0) > 0
    ):
        return {
            "rule": "DISTINCT With GROUP BY",
            "impact": "Low",
            "problem": "GROUP BY already produces unique combinations of the grouped columns. Adding DISTINCT forces an additional deduplication pass on an already-unique result set.",
            "recommendation": "Remove DISTINCT from any query that also uses GROUP BY."
        }
    return None

def check_cross_join(features):
    if features.get("has_cross_join", 0) == 1:
        return {
            "rule": "CROSS JOIN Detected",
            "impact": "Critical",
            "problem": "A CROSS JOIN computes the Cartesian product of two tables. For tables with m and n rows respectively, this produces m × n rows. At the defined table sizes (e.g., customers × orders = 100,000 × 500,000 = 50 billion intermediate rows), this will not complete in reasonable time.",
            "recommendation": "Unless a Cartesian product is the explicit intent, this is almost always a missing JOIN condition. Add the join predicate (e.g., ON a.id = b.a_id)."
        }
    return None

def check_high_cost(features):
    # The 75th percentile total cost in typical generated datasets is around 5000 units
    if (
        features.get("planner_total_cost", 0) > 5000
        and features.get("uses_index_scan", 1) == 0
    ):
        return {
            "rule": "High Planner Cost, No Index Scans",
            "impact": "High",
            "problem": "The query optimizer has estimated high cost AND has found no indexes to use, meaning it will rely entirely on sequential scans. This is the plan most likely to perform poorly under production data volumes.",
            "recommendation": "Review all columns appearing in WHERE, JOIN ON, and ORDER BY clauses and evaluate them as index candidates. Run EXPLAIN ANALYZE to see actual vs estimated row counts, which reveals whether statistics are stale (ANALYZE may be needed)."
        }
    return None