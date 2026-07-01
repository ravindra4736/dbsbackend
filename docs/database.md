# DBS CMS Backend Database

## Prisma

The backend uses Prisma 7 with a MySQL datasource. Prisma is the single source of truth for the database schema and client generation.

## Migrations

- Apply pending migrations with `npx prisma migrate deploy` in production.
- Create a new migration during development with `npx prisma migrate dev --name <name>`.
- Regenerate the client after schema changes with `npm run prisma:generate`.

## Seed Process

The seed script is defined in `prisma/seed.ts` and can be run with:

```bash
npx prisma db seed
```

## Backup Strategy

- Take regular logical backups of the MySQL database.
- Keep backups outside the application container or server where practical.
- Store backup metadata alongside the deployment notes.

## Restore Strategy

1. Stop the application and PM2 process.
2. Restore the MySQL backup into the target database.
3. Run `npx prisma migrate deploy` if the schema version requires it.
4. Restart the application process.
