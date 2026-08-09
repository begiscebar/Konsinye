# Konsinye Freight — Platform Architecture

A multi-tenant SaaS platform connecting Freight Brokers, Dispatchers, Truck
Owners/Motor Carriers and Drivers, operated centrally by a Super Admin team.
Mental model: **Load Board + Dispatch Management + Carrier Management +
Driver Management + Broker Portal + Admin ERP + Communication System.**

## 1. Assumptions (explicit)

- No legal/compliance advice is given anywhere in the product. Compliance
  requirements are **configurable data**, not hard-coded legal rules — an
  admin decides what documents are required per vehicle/carrier type.
- No third-party integration (Maps, GPS/ELD, SMS/Email, Stripe) is live in
  this build. Each has a typed interface in `src/lib/integrations/` with a
  manual/local fallback implementation, so swapping in a real provider later
  is a one-file change, not a rearchitecture. Nothing pretends to be live
  tracking data.
- Single Postgres database, **row-level tenancy** via `companyId` scoping in
  every query (not schema-per-tenant) — simplest model that scales from 5 to
  thousands of trucks; revisit only if a customer requires physical data
  isolation.
- MVP auth is email + password (NextAuth credentials, bcrypt, JWT sessions).
  Email verification / password reset are architected (fields + token table)
  but the actual email send is stubbed behind the notification interface.

## 2. User Roles (RBAC)

| Role | Scope |
|---|---|
| `SUPER_ADMIN` | Global visibility and control across all companies/loads/users |
| `DISPATCHER` | Manages the load board, matches/assigns loads, tracks active loads |
| `TRUCK_OWNER` | Manages their carrier company: trucks, drivers, documents, offers |
| `DRIVER` | Mobile-first: sees assigned loads, updates status, uploads BOL/POD |
| `BROKER` | Posts loads, tracks assigned carrier, receives POD/invoice |

Every table that holds tenant data carries a `companyId`. API/data-access
helpers (`src/lib/rbac.ts`) enforce: Super Admin bypasses scoping; every
other role is auto-filtered to `companyId = session.user.companyId` (or, for
drivers, to loads assigned to them) at the query layer, not just in the UI —
so an API call can't leak another company's data even if the UI wouldn't
render it.

## 3. Core Workflow

```
Broker posts Load (AVAILABLE)
  → Dispatcher reviews, runs Match Engine, sends LoadOffer to a Truck Owner
  → Truck Owner accepts (ACCEPTED) and assigns a Driver + Truck (ASSIGNED)
  → Driver confirms (DRIVER_CONFIRMED) and drives the status lifecycle:
    AT_PICKUP → LOADED → IN_TRANSIT → AT_DELIVERY → DELIVERED
  → POD uploaded (POD_UPLOADED) → COMPLETED
  → Financials computed (commission split) → PAYMENT_PENDING → PAID
Alternate states at any point: CANCELLED, REJECTED, DISPUTED, DELAYED
```

Status transitions are enforced server-side by a state machine
(`src/lib/loadStateMachine.ts`) keyed by role — e.g. only a Driver (or
Admin) can move a load from `LOADED` to `IN_TRANSIT`; only a Truck Owner (or
Admin) can move `OFFERED` → `ACCEPTED`. Every transition writes a
`LoadStatusEvent` (the trip's audit trail / timeline) and a generic
`AuditLog` row.

## 4. Smart Load Matching

`src/lib/matching.ts` scores every eligible truck (0–100) for a given load
using a weighted rubric that mirrors the spec:

| Factor | Weight |
|---|---|
| Equipment/type match (CDL/non-CDL, box truck size, semi) | 25 |
| Distance from truck's current/home location to pickup (deadhead) | 20 |
| Preferred lanes / preferred states match | 15 |
| Rate vs. truck owner's minimum rate | 15 |
| Truck availability | 10 (hard filter, not scored, if unavailable) |
| Historical on-time delivery rate | 10 |
| Average rating | 5 |

Returns a ranked list (`Truck A — 94% match`) with the sub-scores so a
dispatcher can see *why*. This is a pure scoring function today; it's the
same seam a future ML-based ranker would replace.

## 5. Maps / GPS / ELD Integration Layer

`src/lib/integrations/location.ts` defines a `LocationProvider` interface:
`getTruckLocation(truckId)`, `getRoute(origin, dest)`,
`estimateDrive(origin, dest)`. The MVP ships a `ManualLocationProvider`
(dispatcher/driver enters last-known city/state; distance & drive-time
estimated via straight-line haversine + a fixed avg speed — clearly labeled
"estimated" in the UI). A future `SamsaraProvider` / `MotiveProvider` /
`GoogleMapsProvider` implements the same interface — no other code changes.

## 6. Communication

`Message` rows are either load-scoped (`loadId` set — a per-load chat
thread visible to everyone assigned to that load: broker, dispatcher,
carrier, driver) or a direct DM (`recipientId` set). `src/lib/rbac.ts`
enforces who can message whom (e.g. a broker cannot DM a driver directly,
only through the load thread). `Notification` rows are in-app today;
`src/lib/integrations/notify.ts` defines the `NotificationChannel`
interface (`inApp` implemented; `sms`/`email`/`push` are typed stubs that
log instead of sending, ready for Twilio/SES/FCM).

## 7. Documents & Compliance

`Document` is polymorphic (`ownerType`: USER | COMPANY | TRUCK | LOAD +
`ownerId`) so one table covers CDL, medical card, insurance/COI, W-9,
authority/USDOT/MC filings, BOL, POD, rate confirmations, etc.
`ComplianceRequirement` is a **configurable rule table** — admin defines
"Company type X + vehicle class Y requires document type Z" — and a
background check (`src/lib/compliance.ts`) flags missing/expired documents
per company/truck/driver without asserting any specific document is legally
mandatory (that's the operator's call, not the platform's).

## 8. Financials

`LoadFinancials` (1:1 with `Load`) stores gross revenue, platform
commission, dispatcher commission, carrier payment, driver payment, other
fees, net amount, invoice/payment status, payment date, transaction id.
`CommissionRule` is configurable per company/role
(`PERCENTAGE` / `FLAT_PER_LOAD` / `DISPATCH_FLAT_FEE` / `SUBSCRIPTION` /
`MEMBERSHIP` / `BROKER_FEE`) — the commission engine
(`src/lib/commission.ts`) reads the applicable rule at load-completion time
and computes the split; nothing is hard-coded to "10%". `src/lib/
integrations/payments.ts` defines a `PaymentProvider` interface; MVP ships a
`ManualPaymentProvider` (admin marks paid + enters a reference number) ready
to be swapped for a `StripePaymentProvider`.

## 9. Database (Prisma / PostgreSQL)

See `prisma/schema.prisma` for the authoritative source. Entities: `User`,
`Company`, `DriverProfile`, `Truck`, `Load`, `LoadOffer`,
`LoadStatusEvent`, `Document`, `Message`, `Notification`, `CommissionRule`,
`LoadFinancials`, `ComplianceRequirement`, `Rating`, `AuditLog`,
`Subscription`. Kept intentionally flat — e.g. "TruckOwner" isn't a
separate table, it's `Company{type: CARRIER}` plus a `User{role:
TRUCK_OWNER}` who administers it — to avoid the over-normalization the spec
explicitly warns against, while still covering every listed entity's data.

## 10. Screens (by role)

- **Admin** (desktop): Overview/analytics, Users, Companies, Trucks, Loads
  (all), Commissions & Fees config, Compliance, Audit Log.
- **Dispatcher** (desktop): Load Board (search/filter), Load Detail +
  Match panel, My Active Loads, Messages, Earnings.
- **Truck Owner** (responsive): Company Profile, Trucks, Drivers, Documents,
  Load Offers (accept/reject), Active/Completed Loads, Revenue.
- **Driver** (mobile-first, large tap targets): My Loads, Load Detail with
  one-tap status buttons, Upload BOL/POD, Report Delay/Breakdown, Messages.
- **Broker** (responsive): Post Load, My Loads (tracking), Documents/POD,
  Invoices.

## 11. MVP vs. Phase 2

**MVP (this build):** auth + RBAC, all 5 dashboards, truck/driver
management, load CRUD + board + filters, offer → accept → assign → status
lifecycle, match scoring, document upload + expiration flags, in-app
messaging (load threads), in-app notifications, commission engine +
financial breakdown per load, admin analytics (aggregate queries + charts),
audit log.

**Phase 2 (architected for, not built):** live GPS/ELD provider
integrations, Stripe payments + payout automation, SMS/email/push send,
real routing/mileage via Google Maps/Mapbox, subscription billing UI,
dispute workflow UI, multi-currency, rate confirmation e-signature,
carrier/driver public API, mobile native app (the driver web UI is already
mobile-first and PWA-installable, same pattern as the existing jewelry app).

## 12. Third-party dependencies this will eventually need (not faked)

- **Maps/routing**: Google Maps Platform or Mapbox API key.
- **GPS/ELD**: Samsara / Motive / Geotab (or similar) API credentials —
  each carrier would need their own ELD account connected.
- **Payments**: Stripe account (Connect, if paying out carriers directly).
- **SMS/Email**: Twilio + an email provider (SES/Postmark/SendGrid).
- **File storage** (production): S3 or equivalent (local disk is used in
  dev only).
