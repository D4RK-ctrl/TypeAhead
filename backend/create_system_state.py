from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://admin:admin@localhost:5432/typeahead"

engine = create_engine(DATABASE_URL)

query = """
CREATE TABLE IF NOT EXISTS system_state(
    key TEXT PRIMARY KEY,
    value DOUBLE PRECISION NOT NULL
);
"""

with engine.begin() as conn:
    conn.execute(text(query))

print("system_state table created")