from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://admin:admin@localhost:5432/typeahead"

engine = create_engine(DATABASE_URL)

query = """
CREATE TABLE IF NOT EXISTS queries(
    query TEXT PRIMARY KEY,
    count BIGINT NOT NULL
);
"""

with engine.begin() as conn:
    conn.execute(text(query))

print("Table Created Successfully")