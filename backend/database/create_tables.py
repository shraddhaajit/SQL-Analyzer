from db_connection import get_connection


def create_tables():

    conn = get_connection()
    cur = conn.cursor()

    with open("schema.sql", "r") as file:
        schema = file.read()

    cur.execute(schema)

    conn.commit()

    cur.close()
    conn.close()

    print("Tables created successfully")


if __name__ == "__main__":
    create_tables()