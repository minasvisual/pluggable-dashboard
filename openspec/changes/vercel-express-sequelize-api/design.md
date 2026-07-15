## Context

The system needs to expose database-backed endpoints to perform CRUD actions on a `Model` resource (with name, domain, and content fields) using Sequelize as an ORM and Express for routing. These endpoints need to be compatible with Vercel serverless functions (ESM handler format) and conform to security standards (checking the `x-internal-secret` header).

## Goals / Non-Goals

**Goals:**
- Implement a Vercel-compatible API endpoint `/api/models` using Express and Sequelize.
- Support standard CRUD actions (GET, POST, PUT, DELETE) on a database.
- Enforce the `x-internal-secret` header validation using middleware.
- Cache the Sequelize connection instance across serverless function invocations to prevent connection leaks.

**Non-Goals:**
- Setting up external database hosting. We will use SQLite by default for development/local execution, but allow configuring external databases (like PostgreSQL) via environment variables.
- Building frontend pages/components for CRUD (this change only implements the backend API and its specs).

## Decisions

- **Express routing inside ESM handler**: We will instantiate Express and route requests through it inside the Vercel ESM `export default handler(req, res)` function. This allows us to use standard Express routing and middleware while keeping compatibility with Vercel's serverless function entrypoint.
- **Sequelize connection caching**: Establish the Sequelize connection lazily and cache the database connection and models outside the handler function. This ensures that subsequent serverless invocations reuse the existing database connection.
- **Database Dialect**: Use SQLite for local development and testing, storing the database file locally (e.g., `db.sqlite`). We will support configuring connection strings for other SQL dialects (like PostgreSQL) using standard environment variables if defined.

## Risks / Trade-offs

- **SQLite ephemeral state in Serverless**: SQLite files are ephemeral on Vercel deployments.
  - *Mitigation*: For production deployments, configure a hosted SQL database (like PostgreSQL) via environment variables. SQLite is strictly for local dev/testing.
- **Connection pooling limits**: Serverless functions can spawn many instances and exceed DB connection limits.
  - *Mitigation*: Configure Sequelize pool settings with a small maximum connection limit and short idle timeouts.
