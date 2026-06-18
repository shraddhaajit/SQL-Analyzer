import pandas as pd
import numpy as np

def generate_mock_data(n_samples=9000):
    np.random.seed(42)
    
    # 1-16 Structural Features
    data = {
        'table_count': np.random.randint(1, 6, n_samples),
        'join_count': np.random.randint(0, 5, n_samples),
        'has_cross_join': np.random.choice([True, False], n_samples, p=[0.05, 0.95]),
        'has_outer_join': np.random.choice([True, False], n_samples, p=[0.15, 0.85]),
        'where_condition_count': np.random.randint(0, 10, n_samples),
        'has_like': np.random.choice([True, False], n_samples),
        'has_in_list': np.random.choice([True, False], n_samples),
        'group_by_column_count': np.random.randint(0, 4, n_samples),
        'order_by_column_count': np.random.randint(0, 3, n_samples),
        'has_having': np.random.choice([True, False], n_samples, p=[0.1, 0.9]),
        'subquery_count': np.random.randint(0, 4, n_samples),
        'aggregate_function_count': np.random.randint(0, 5, n_samples),
        'has_distinct': np.random.choice([True, False], n_samples, p=[0.2, 0.8]),
        'union_count': np.random.randint(0, 2, n_samples),
        'query_char_length': np.random.randint(50, 1500, n_samples),
        'nesting_depth': np.random.randint(0, 4, n_samples),
    }
    
    # 17-22 Planner Features
    data['planner_estimated_rows'] = np.random.exponential(5000, n_samples)
    data['planner_total_cost'] = np.random.exponential(10000, n_samples)
    data['planner_startup_cost'] = data['planner_total_cost'] * np.random.uniform(0.01, 0.5, n_samples)
    data['uses_index_scan'] = np.random.choice([True, False], n_samples, p=[0.6, 0.4])
    data['plan_node_count'] = np.random.randint(1, 15, n_samples)
    
    # Complexity Score (0-100)
    data['complexity_score'] = np.random.uniform(0, 100, n_samples)
    
    # Add tiers (1-5) for stratified split
    tiers = []
    for score in data['complexity_score']:
        if score < 20: tiers.append(1)
        elif score < 40: tiers.append(2)
        elif score < 60: tiers.append(3)
        elif score < 80: tiers.append(4)
        else: tiers.append(5)
    data['tier'] = tiers
    
    df = pd.DataFrame(data)
    
    # Synthetic target: median_execution_time_ms
    base_time = 10.0
    time_ms = (base_time + 
               df['join_count'] * 50 + 
               df['subquery_count'] * 100 + 
               (df['planner_estimated_rows'] / 1000) * 5 +
               (df['planner_total_cost'] / 1000) * 10)
    
    time_ms = np.where(df['uses_index_scan'], time_ms * 0.4, time_ms * 1.5)
    noise = np.random.lognormal(mean=0, sigma=0.5, size=n_samples)
    
    df['median_execution_time_ms'] = time_ms * noise
    return df

if __name__ == "__main__":
    df = generate_mock_data()
    df.to_csv('mock_dataset.csv', index=False)
    print("Created mock_dataset.csv with shape:", df.shape)
