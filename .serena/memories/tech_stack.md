# Tech Stack

- API: NestJS 11, TypeScript 5.9, TypeORM 0.3, PostgreSQL, BullMQ/Redis, Stripe SDK, Nodemailer/Handlebars, Swagger.
- Web: Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn-style local UI components, Stripe React SDK, jsQR.
- Package manager: npm with separate lockfiles in `apps/api` and `apps/web`.
- Runtime targets used locally: Docker services plus local `npm run build`/`lint`; API reads `apps/api/.env`, web reads `apps/web/.env.local`.
- Repo is Windows/PowerShell friendly; paths may include Vietnamese characters.