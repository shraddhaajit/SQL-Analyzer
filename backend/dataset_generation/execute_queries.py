import time
import pandas as pd

from backend.database.db_connection import (
    get_connection
)


def execute_query(query):

    conn = get_connection()

    cur = conn.cursor()

    execution_times = []

    for _ in range(3):

        start = time.perf_counter()

        cur.execute(query)

        try:
            cur.fetchmany(10000)
        except:
            pass

        end = time.perf_counter()

        execution_times.append(
            (end - start) * 1000
        )

    cur.close()
    conn.close()

    execution_times.sort()

    median_time = execution_times[1]

    return round(
        median_time,
        4
    )