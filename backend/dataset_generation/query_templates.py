TIER_1 = [
    "SELECT * FROM customers WHERE id = {id}",
    "SELECT * FROM products WHERE price > {price}",
    "SELECT * FROM employees WHERE salary > {salary}",
]

TIER_2 = [
    """
    SELECT *
    FROM customers
    WHERE city = '{city}'
    AND id > {id}
    """,

    """
    SELECT *
    FROM products
    WHERE category = '{category}'
    AND price > {price}
    """
]

TIER_3 = [
    """
    SELECT *
    FROM customers c
    JOIN orders o
    ON c.id = o.customer_id
    WHERE o.amount > {amount}
    """,

    """
    SELECT *
    FROM orders o
    JOIN products p
    ON o.product_id = p.id
    WHERE p.price > {price}
    """
]

TIER_4 = [
    """
    SELECT customer_id,
           COUNT(*) AS total_orders
    FROM orders
    GROUP BY customer_id
    HAVING COUNT(*) > {count}
    """,

    """
    SELECT product_id,
           AVG(amount)
    FROM orders
    GROUP BY product_id
    """
]

TIER_5 = [
    """
    SELECT c.name
    FROM customers c
    WHERE c.id IN (
        SELECT customer_id
        FROM orders
        GROUP BY customer_id
        HAVING COUNT(*) > {count}
    )
    """,

    """
    SELECT *
    FROM customers c
    JOIN orders o
        ON c.id = o.customer_id
    JOIN products p
        ON o.product_id = p.id
    WHERE p.price > {price}
    ORDER BY o.amount DESC
    """
]