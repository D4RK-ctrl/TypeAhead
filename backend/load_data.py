import pandas as pd
from sqlalchemy import create_engine

DATABASE_URL = "postgresql://admin:admin@localhost:5432/typeahead"

engine = create_engine(DATABASE_URL)

print("Reading CSV...")

df = pd.read_csv("query_count.csv")

print(f"Rows found: {len(df)}")

print("Loading into PostgreSQL...")

df.to_sql(
    "queries",
    engine,
    if_exists="append",
    index=False,
    method="multi",
    chunksize=5000
)

print("Data Loaded Successfully")