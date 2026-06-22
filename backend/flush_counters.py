from sqlalchemy import create_engine, text
import redis

DATABASE_URL = "postgresql://admin:admin@localhost:5432/typeahead"

engine = create_engine(DATABASE_URL)

redis_client = redis.Redis(
    host="localhost",
    port=6379,
    decode_responses=True
)

with engine.begin() as conn:

    current_k = conn.execute(
        text("""
        SELECT value
        FROM system_state
        WHERE key = 'current_k'
        """)
    ).scalar()

    print(f"Current k = {current_k}")

    keys = redis_client.keys("search_count:*")

    print(f"Found {len(keys)} counters")

    for key in keys:

        query = key.replace(
            "search_count:",
            ""
        )

        count = int(
            redis_client.get(key)
        )

        weighted_score = count * current_k

        conn.execute(
            text("""
            INSERT INTO trending_queries(query, score)
            VALUES (:query, :score)

            ON CONFLICT (query)
            DO UPDATE SET
            score = trending_queries.score + EXCLUDED.score
            """),
            {
                "query": query,
                "score": weighted_score
            }
        )

        redis_client.delete(key)

    new_k = current_k * 1.01

    conn.execute(
        text("""
        UPDATE system_state
        SET value = :new_k
        WHERE key = 'current_k'
        """),
        {
            "new_k": new_k
        }
    )

print(f"k updated from {current_k} to {new_k}")
print("Batch Flush Complete")