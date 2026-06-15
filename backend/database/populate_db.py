from backend.database.db_connection import get_connection
from faker import Faker
from tqdm import tqdm
import random

fake = Faker()


def populate_customers(count=1000):

    conn = get_connection()
    cur = conn.cursor()

    for _ in tqdm(range(count), desc="Customers"):

        cur.execute(
            """
            INSERT INTO customers
            (name, city, email, created_at)
            VALUES (%s,%s,%s,%s)
            """,
            (
                fake.name(),
                fake.city(),
                fake.email(),
                fake.date_time()
            )
        )

    conn.commit()
    cur.close()
    conn.close()

    print("Customers inserted")


def populate_products(count=100):

    conn = get_connection()
    cur = conn.cursor()

    categories = [
        "Electronics",
        "Clothing",
        "Books",
        "Furniture",
        "Sports"
    ]

    for _ in tqdm(range(count), desc="Products"):

        cur.execute(
            """
            INSERT INTO products
            (name, category, price, stock_count)
            VALUES (%s,%s,%s,%s)
            """,
            (
                fake.word().title(),
                random.choice(categories),
                round(random.uniform(100, 5000), 2),
                random.randint(1, 500)
            )
        )

    conn.commit()
    cur.close()
    conn.close()

    print("Products inserted")
def populate_employees(count=50):

    conn = get_connection()
    cur = conn.cursor()

    departments = [
        "Sales",
        "HR",
        "Finance",
        "IT",
        "Operations"
    ]

    for _ in tqdm(range(count), desc="Employees"):

        cur.execute(
            """
            INSERT INTO employees
            (name, department, salary, manager_id)
            VALUES (%s,%s,%s,%s)
            """,
            (
                fake.name(),
                random.choice(departments),
                round(random.uniform(30000, 150000), 2),
                None
            )
        )

    conn.commit()
    cur.close()
    conn.close()

    print("Employees inserted")
def populate_orders(count=5000):

    conn = get_connection()
    cur = conn.cursor()

    for _ in tqdm(range(count), desc="Orders"):

        customer_id = random.randint(1, 1000)
        product_id = random.randint(1, 100)

        cur.execute(
            """
            INSERT INTO orders
            (
                customer_id,
                product_id,
                amount,
                order_date,
                status
            )
            VALUES (%s,%s,%s,%s,%s)
            """,
            (
                customer_id,
                product_id,
                round(random.uniform(100, 10000), 2),
                fake.date_this_decade(),
                random.choice(
                    [
                        "Pending",
                        "Completed",
                        "Cancelled"
                    ]
                )
            )
        )

    conn.commit()
    cur.close()
    conn.close()

    print("Orders inserted")
def populate_payments(count=5000):

    conn = get_connection()
    cur = conn.cursor()

    for _ in tqdm(range(count), desc="Payments"):

        order_id = random.randint(1, 5000)

        cur.execute(
            """
            INSERT INTO payments
            (
                order_id,
                method,
                status,
                paid_at
            )
            VALUES (%s,%s,%s,%s)
            """,
            (
                order_id,
                random.choice(
                    [
                        "UPI",
                        "Card",
                        "NetBanking",
                        "Cash"
                    ]
                ),
                random.choice(
                    [
                        "Success",
                        "Failed",
                        "Pending"
                    ]
                ),
                fake.date_time()
            )
        )

    conn.commit()
    cur.close()
    conn.close()

    print("Payments inserted")
if __name__ == "__main__":

    populate_customers(1000)

    populate_products(100)

    populate_employees(50)

    populate_orders(5000)

    populate_payments(5000)