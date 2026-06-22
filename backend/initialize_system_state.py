from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://admin:admin@localhost:5432/typeahead"

engine = create_engine(DATABASE_URL)

with engine.begin() as conn:

    conn.execute(
        text("""
        INSERT INTO system_state(key, value)
        VALUES ('current_k', 1.0)
        ON CONFLICT (key)
        DO NOTHING
        """)
    )

print("current_k initialized")