from backend.database.db_connection import get_connection
from psycopg2.extras import execute_batch
from faker import Faker
from tqdm import tqdm
import random

fake = Faker()

def populate_customers(count=100000):
    conn = get_connection()
    cur = conn.cursor()
    
    batch_size = 10000
    for i in tqdm(range(0, count, batch_size), desc="Customers Batch"):
        current_batch = min(batch_size, count - i)
        data = [
            (fake.name(), fake.city(), fake.email(), fake.date_time())
            for _ in range(current_batch)
        ]
        execute_batch(cur, """
            INSERT INTO customers (name, city, email, created_at)
            VALUES (%s, %s, %s, %s)
        """, data)
        conn.commit()
        
    cur.close()
    conn.close()
    print("Customers inserted")

def populate_products(count=10000):
    conn = get_connection()
    cur = conn.cursor()
    
    categories = ["Electronics", "Clothing", "Books", "Furniture", "Sports"]
    
    batch_size = 5000
    for i in tqdm(range(0, count, batch_size), desc="Products Batch"):
        current_batch = min(batch_size, count - i)
        data = [
            (
                fake.word().title(),
                random.choice(categories),
                round(random.uniform(100, 5000), 2),
                random.randint(1, 500)
            )
            for _ in range(current_batch)
        ]
        execute_batch(cur, """
            INSERT INTO products (name, category, price, stock_count)
            VALUES (%s, %s, %s, %s)
        """, data)
        conn.commit()
        
    cur.close()
    conn.close()
    print("Products inserted")

def populate_employees(count=5000):
    conn = get_connection()
    cur = conn.cursor()
    
    departments = ["Sales", "HR", "Finance", "IT", "Operations"]
    
    batch_size = 1000
    for i in tqdm(range(0, count, batch_size), desc="Employees Batch"):
        current_batch = min(batch_size, count - i)
        data = [
            (
                fake.name(),
                random.choice(departments),
                round(random.uniform(30000, 150000), 2),
                None
            )
            for _ in range(current_batch)
        ]
        execute_batch(cur, """
            INSERT INTO employees (name, department, salary, manager_id)
            VALUES (%s, %s, %s, %s)
        """, data)
        conn.commit()
        
    # Self-referencing managers setting (set manager_id to a random existing employee ID)
    cur = conn.cursor()
    cur.execute("SELECT id FROM employees")
    ids = [r[0] for r in cur.fetchall()]
    
    updates = []
    for emp_id in ids:
        if random.random() > 0.2:  # 80% have managers
            manager_id = random.choice(ids)
            if manager_id != emp_id:
                updates.append((manager_id, emp_id))
                
    execute_batch(cur, """
        UPDATE employees SET manager_id = %s WHERE id = %s
    """, updates)
    conn.commit()
    
    cur.close()
    conn.close()
    print("Employees inserted & managers updated")

def populate_orders(count=500000):
    conn = get_connection()
    cur = conn.cursor()
    
    # Get total count of customers and products
    cur.execute("SELECT MIN(id), MAX(id) FROM customers")
    min_cust, max_cust = cur.fetchone()
    cur.execute("SELECT MIN(id), MAX(id) FROM products")
    min_prod, max_prod = cur.fetchone()
    
    batch_size = 10000
    for i in tqdm(range(0, count, batch_size), desc="Orders Batch"):
        current_batch = min(batch_size, count - i)
        data = [
            (
                random.randint(min_cust, max_cust),
                random.randint(min_prod, max_prod),
                round(random.uniform(100, 10000), 2),
                fake.date_this_decade(),
                random.choice(["Pending", "Completed", "Cancelled"])
            )
            for _ in range(current_batch)
        ]
        execute_batch(cur, """
            INSERT INTO orders (customer_id, product_id, amount, order_date, status)
            VALUES (%s, %s, %s, %s, %s)
        """, data)
        conn.commit()
        
    cur.close()
    conn.close()
    print("Orders inserted")

def populate_payments(count=500000):
    conn = get_connection()
    cur = conn.cursor()
    
    # Get range of orders
    cur.execute("SELECT MIN(id), MAX(id) FROM orders")
    min_order, max_order = cur.fetchone()
    
    batch_size = 10000
    for i in tqdm(range(0, count, batch_size), desc="Payments Batch"):
        current_batch = min(batch_size, count - i)
        data = [
            (
                random.randint(min_order, max_order),
                random.choice(["UPI", "Card", "NetBanking", "Cash"]),
                random.choice(["Success", "Failed", "Pending"]),
                fake.date_time()
            )
            for _ in range(current_batch)
        ]
        execute_batch(cur, """
            INSERT INTO payments (order_id, method, status, paid_at)
            VALUES (%s, %s, %s, %s)
        """, data)
        conn.commit()
        
    cur.close()
    conn.close()
    print("Payments inserted")

if __name__ == "__main__":
    # Scales according to Section 4.1
    populate_customers(100000)
    populate_products(10000)
    populate_employees(5000)
    populate_orders(500000)
    populate_payments(500000)