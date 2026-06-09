# Suggested Commands

- Root Docker stack: `docker compose ps`, `docker compose up -d`, `docker compose logs --tail=120 api`.
- API: from `apps/api`: `npm run build`, `npm run lint`, `npm test -- --runInBand`, `npm run migration:run`, `npm run seed:run:relational`, `npm run start:dev`.
- Web: from `apps/web`: `npm run build`, `npm run lint`, `npm run dev`.
- Manual QA endpoints: web `http://localhost:3000`, API Swagger `http://localhost:4000/docs`, Maildev `http://localhost:1080`.
- Windows file search: use `rg --files` and `rg "pattern"` from repo root.