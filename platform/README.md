# Konsinye Freight

A multi-tenant SaaS platform for U.S. trucking/freight operations: load
board + dispatch management + carrier management + driver management +
broker portal + admin ERP, in one app. See `ARCHITECTURE.md` for the full
product/technical design (roles, workflows, database, matching engine,
integration seams, MVP vs. Phase 2).

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS, Prisma + PostgreSQL,
NextAuth (credentials + JWT, RBAC).

## Run it locally

Requires Node 18+ and Docker (for Postgres) — or point `DATABASE_URL` at
any Postgres instance you already have.

```bash
cd platform
cp .env.example .env        # edit NEXTAUTH_SECRET if you like
docker compose up -d        # starts Postgres on localhost:5432

npm install
npm run prisma:migrate      # creates the schema
npm run prisma:seed         # loads realistic sample data across every role

npm run dev
```

Open http://localhost:3000 — you'll land on `/login`.

### Sample accounts (seeded, password for all: `Password123!`)

| Role | Email |
|---|---|
| Super Admin | `admin@konsinye.com` |
| Dispatcher | `dispatcher@konsinye.com` |
| Broker | `broker@konsinye.com` |
| Truck Owner (Rodriguez Trucking) | `owner1@konsinye.com` |
| Truck Owner (Great Plains Carriers) | `owner2@konsinye.com` |
| Driver (Carlos Nunez) | `driver1@konsinye.com` |
| Driver (Priya Shah) | `driver2@konsinye.com` |
| Pending signup (can't sign in yet — approve as admin) | `pending@konsinye.com` |

A good first walkthrough: sign in as **dispatcher**, open the load board,
click the `KF-100001` AVAILABLE load, and use the "Recommended trucks"
match panel to offer it to a carrier. Then sign in as that **truck owner**
(`owner1@konsinye.com` or `owner2@konsinye.com`) to accept it and assign a
truck + driver. Then sign in as that **driver** to walk the status buttons
through pickup → delivery → POD upload. Sign in as **admin** any time to see
it all from the top.

## What's real vs. stubbed in this MVP

Real: auth + RBAC, all 5 role dashboards, truck/driver management, load
board with filters, offer → accept → assign → full status lifecycle, the
0–100 match-scoring engine, document upload/review/expiration tracking,
load-scoped in-app messaging, in-app notifications, the configurable
commission engine (nothing is hard-coded — see Admin → Commissions), a
compliance flag checker, admin analytics, and a full audit log.

Stubbed behind clean interfaces (see `ARCHITECTURE.md` §5, §7, §9, and
`src/lib/integrations/`), because no credentials for these exist yet:
live GPS/ELD truck tracking (distance is estimated from state centroids,
clearly not real telemetry), Stripe/payment processing (an admin marks
loads paid manually), and SMS/email/push send (notifications are in-app
only; other channels log to the console instead of sending). Swapping in a
real provider for any of these is implementing one interface, not a
rearchitecture.

## Project layout

```
prisma/schema.prisma       # database schema (see ARCHITECTURE.md §9)
prisma/seed.ts             # sample data across every role
src/lib/                   # auth, RBAC, domain logic (matching, commission,
                            # compliance, state machine), integration seams
src/app/api/                # REST route handlers
src/app/{admin,dispatcher,owner,driver,broker}/  # one dashboard per role
src/components/            # shared UI (LoadBoard, LoadDetail, DocumentManager…)
```

## Known follow-up: dependency advisories

`npm audit` flags advisories in `next@14.2.x` (mostly DoS/SSRF edge cases in
self-hosted deployments — see `npm audit` output) whose fix requires
upgrading to Next 16, a breaking change (route handler signatures, etc.)
out of scope for this MVP pass. Before any public/production deployment,
budget time to upgrade and re-test the App Router routes.

## Production notes

- Set a real `NEXTAUTH_SECRET`, run behind HTTPS, and point `DATABASE_URL`
  at a managed Postgres instance.
- File uploads currently land on local disk (`storage/uploads/`, gitignored)
  and are served only through the authenticated `/api/documents/[id]/file`
  route. Swap `src/lib/integrations/storage.ts` for an S3-backed provider
  before deploying anywhere without a persistent disk.
- See `ARCHITECTURE.md` §12 for the third-party accounts you'd need to turn
  on Maps/GPS/ELD, Stripe, and SMS/Email.
