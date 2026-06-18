from db_connection import get_connection


def create_tables():

    conn = get_connection()
    cur = conn.cursor()

    import os
    schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")
    with open(schema_path, "r") as file:
        schema = file.read()

    cur.execute(schema)

    conn.commit()

    cur.close()
    conn.close()

    print("Tables created successfully")


if __name__ == "__main__":
    create_tables()