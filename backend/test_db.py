from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://admin:admin@localhost:5432/typeahead"

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("SELECT version();"))

    for row in result:
        print(row[0])

print("Connected Successfully")