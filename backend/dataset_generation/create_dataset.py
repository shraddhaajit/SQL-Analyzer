import pandas as pd
from tqdm import tqdm

from backend.dataset_generation.execute_queries import (
    execute_query
)

from backend.database.db_connection import (
    get_connection
)

from backend.feature_extraction.feature_vector import (
    build_feature_vector
)


def create_dataset():

    df = pd.read_csv(
        "generated_queries.csv"
    )

    conn = get_connection()

    dataset_rows = []

    for query in tqdm(
        df["query"],
        desc="Creating Dataset"
    ):

        try:

            features = build_feature_vector(
                query,
                conn
            )

            execution_time = execute_query(
                query
            )

            features[
                "execution_time_ms"
            ] = execution_time

            dataset_rows.append(
                features
            )

        except Exception as e:

            print(
                f"Error: {e}"
            )

    conn.close()

    dataset_df = pd.DataFrame(
        dataset_rows
    )

    dataset_df.to_csv(
        "dataset.csv",
        index=False
    )

    print(
        "Dataset Created Successfully"
    )


if __name__ == "__main__":
    create_dataset()