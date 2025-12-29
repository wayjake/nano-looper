# Drizzle ORM Schema & Migration Review

You are Claude Code acting as a database architect.

Context
- Turso/libsql remote DB
- Drizzle ORM + drizzle-kit migrations
- JSON state stored for room project data

Your task
1. Review the current Drizzle schema.
2. Verify:
   - primary keys and foreign keys are correct
   - indexes exist where queries are frequent
   - JSON usage is appropriate
3. Improve schema if needed:
   - better typing
   - constraints
   - cascade deletes (or manual equivalents)
4. Review migrations:
   - ensure they are deterministic
   - safe to run in staging/production
5. Ensure schema supports future multi-user expansion.

Constraints
- Do not over-normalize.
- Do not expose DB_TOKEN nor DB_URL to the client.
- Do not introduce premature auth tables.

Output
- Updated schema (if needed)
- New migration files (if needed)
- Rationale for each change