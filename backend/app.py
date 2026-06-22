from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from consistent_hash import ConsistentHash
from pydantic import BaseModel
import redis
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = "postgresql://admin:admin@localhost:5432/typeahead"

engine = create_engine(DATABASE_URL)

redis_client = redis.Redis(
    host="localhost",
    port=6379,
    decode_responses=True
)

ring = ConsistentHash()
class SearchRequest(BaseModel):
    query: str


@app.get("/")
def home():
    return {
        "message": "Typeahead Service Running"
    }


@app.get("/suggest")
def suggest(q: str):

    q = q.lower().strip()

    if len(q) < 3:
        return {
            "prefix": q,
            "count": 0,
            "suggestions": []
        }

    node = ring.get_node(q)

    cache_key = f"{node}:suggest:{q}"

    cached_value = redis_client.get(cache_key)

    if cached_value:

        suggestions = json.loads(cached_value)

        return {
            "prefix": q,
            "count": len(suggestions),
            "cache": "hit",
            "node": node,
            "suggestions": suggestions
        }

    sql = """
    SELECT query
    FROM queries
    WHERE query LIKE :prefix
    ORDER BY count DESC
    LIMIT 10
    """

    with engine.connect() as conn:

        result = conn.execute(
            text(sql),
            {
                "prefix": f"{q}%"
            }
        )

        suggestions = [
            row[0]
            for row in result
        ]

    redis_client.setex(
        cache_key,
        300,
        json.dumps(suggestions)
    )

    return {
        "prefix": q,
        "count": len(suggestions),
        "cache": "miss",
        "node": node,
        "suggestions": suggestions
    }

@app.post("/search")
def search(request: SearchRequest):

    query = request.query.lower().strip()

    if len(query) == 0:
        return {
            "status": "error",
            "message": "empty query"
        }

    redis_client.incr(
        f"search_count:{query}"
    )

    return {
        "status": "success",
        "query": query
    }

@app.get("/trending")
def trending():

    sql = """
    SELECT query, score
    FROM trending_queries
    ORDER BY score DESC
    LIMIT 10
    """

    with engine.connect() as conn:

        result = conn.execute(text(sql))

        queries = []

        for row in result:

            queries.append(
                {
                    "query": row[0],
                    "score": row[1]
                }
            )

    return {
        "count": len(queries),
        "queries": queries
    }

@app.post("/flush")
def flush():
    try:
        with engine.begin() as conn:
            current_k = conn.execute(
                text("""
                SELECT value
                FROM system_state
                WHERE key = 'current_k'
                """)
            ).scalar()

            if current_k is None:
                current_k = 1.0

            keys = redis_client.keys("search_count:*")
            flushed_count = len(keys)
            flushed_queries = []

            for key in keys:
                query = key.replace("search_count:", "")
                count = int(redis_client.get(key) or 0)
                weighted_score = count * current_k

                # Update trending_queries
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

                # Also update main queries table
                conn.execute(
                    text("""
                    INSERT INTO queries(query, count)
                    VALUES (:query, :count)
                    ON CONFLICT (query)
                    DO UPDATE SET
                    count = queries.count + EXCLUDED.count
                    """),
                    {
                        "query": query,
                        "count": count
                    }
                )

                redis_client.delete(key)
                flushed_queries.append({"query": query, "count": count, "score": weighted_score})

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

            # Invalidate cached suggestions
            suggest_keys = redis_client.keys("*:suggest:*")
            for sk in suggest_keys:
                redis_client.delete(sk)

            return {
                "status": "success",
                "flushed_count": flushed_count,
                "old_k": current_k,
                "new_k": new_k,
                "flushed_queries": flushed_queries
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.get("/status")
def status():
    try:
        with engine.connect() as conn:
            current_k = conn.execute(
                text("""
                SELECT value
                FROM system_state
                WHERE key = 'current_k'
                """)
            ).scalar()
            if current_k is None:
                current_k = 1.0

        buffer_keys = redis_client.keys("search_count:*")
        buffer_count = len(buffer_keys)

        return {
            "current_k": current_k,
            "buffer_count": buffer_count
        }
    except Exception as e:
        return {"error": str(e)}