# TypeAhead Project Brief for Frontend Work

## What has been completed so far

We are building a **Search Typeahead System** for a college HLD assignment.

### Backend and infrastructure already done
- FastAPI backend is running.
- PostgreSQL is running in Docker.
- Redis is running in Docker.
- A cleaned dataset of about **150,000 queries** has been prepared from the AOL `.txt` dataset.
- The cleaned data was imported into PostgreSQL.
- The main table `queries` exists with columns:
  - `query`
  - `count`
- A `trending_queries` table exists.
- A `system_state` table exists with `current_k = 1.0`.
- The backend currently has these APIs:
  - `GET /` → health check
  - `GET /suggest?q=...` → typeahead suggestions
  - `POST /search` → records a search into Redis counters
  - `GET /trending` → returns trending queries
- Redis caching is implemented for suggestions.
- Cache keys use a prefix namespace like `suggest:<prefix>`.
- TTL-based cache invalidation is implemented.
- Consistent hashing is implemented with a simple ring and **3 logical cache nodes** using **virtual nodes**.
- Batch writes are implemented through Redis counters and a manual flush script.

### Important implementation choices already made
- Suggestions appear only when the query length is at least 3.
- Suggestions are sorted by count in descending order.
- Redis is used as the cache layer.
- PostgreSQL is the source of truth for query data.
- The frontend should call the backend APIs, not read files directly.

## What still needs to be done

### Frontend requirements
Build a clean React frontend that supports:
- search input box
- live typeahead suggestions dropdown
- search submission
- trending section
- loading state and error handling
- keyboard navigation for suggestions if possible

### Nice-to-have frontend behavior
- Debounce API calls while typing
- Show cache/debug info if useful for demo
- Show recent/trending searches in a separate panel
- Keep the UI minimal and easy to explain in viva

## Backend-facing API contract
The frontend should use these endpoints:
- `GET /suggest?q=<prefix>`
- `POST /search`
- `GET /trending`

## Suggested frontend plan
1. Create a React app with Vite.
2. Make a search page with one input box.
3. Call `/suggest` as the user types.
4. Show the suggestion list below the input.
5. Submit the chosen query to `/search`.
6. Show trending queries from `/trending`.
7. Keep the design simple and presentation-friendly.

## Notes for the frontend implementation
- This project is mainly about backend/system design concepts.
- The frontend should be simple and functional, not overly decorative.
- The final demo should clearly show the search box, suggestion dropdown, and trending panel.
- The app should feel responsive and easy to use.

## Goal for the final submission
The frontend should help demonstrate:
- typeahead suggestions
- cache hit/miss behavior
- trending queries
- the full search flow from UI to backend

## Useful explanation for viva
The project is a modular typeahead system where:
- PostgreSQL stores the main query data
- Redis caches suggestion results
- consistent hashing distributes cache keys logically
- batch writes reduce database pressure
- trending queries are computed separately and exposed through an API

