# CreditSea Loan Management System

## Technical Requirements and Design

**Technical stage:** Current implementation baseline  
**Document purpose:** Describe the implemented architecture, contracts, persistence model, security controls, and operating procedures for CreditSea.

## 1. Architecture overview

CreditSea is a two-application web system:

```text
Browser
  |
  | Next.js frontend, cookie credentials, REST JSON/multipart
  v
Express API
  |-- authentication and RBAC
  |-- borrower, eligibility, loan, payment, and upload services
  |-- validation and error normalization
  v
MongoDB via Mongoose

Express API ----> ImgBB
                  salary-slip hosting and retrieval
```

The frontend is responsible for presentation, local form state, browser-level validation, loading states, and navigation. The backend is authoritative for identity, eligibility, business rules, status transitions, payment integrity, and persistence.

## 2. Technology baseline

| Area | Implementation |
|---|---|
| Frontend | Next.js 14 App Router, React 18, TypeScript, Tailwind CSS |
| Backend | Node.js, Express 4, TypeScript |
| Database | MongoDB with Mongoose 8 |
| Authentication | JWT, bcryptjs, HttpOnly cookie; Bearer token accepted as an API compatibility fallback |
| Validation | Zod request schemas, Mongoose model validation, browser constraint validation |
| File handling | Multer memory storage, ImgBB upload and proxy preview |
| Security middleware | Helmet, CORS with credentials, request size limit |
| UI feedback | Shared toast provider, inline errors, loaders, empty states, bottom-right format tooltips |

Default local ports are frontend `3000` and backend `5000`.

## 3. Repository structure

```text
/
|- backend/
|  |- scripts/seed.ts
|  `- src/
|     |- config/          environment and database connection/migration
|     |- constants/       roles, statuses, limits, shared regexes
|     |- controllers/     HTTP request/response adapters
|     |- middleware/      auth, RBAC, validation, upload, and errors
|     |- models/          User, Loan, and Payment schemas
|     |- routes/          auth, borrower, and operations routes
|     |- services/        auth, eligibility, file, loan, and payment behavior
|     |- types/           domain and Express request types
|     |- utils/           epoch, pagination, public serializers, and money rounding
|     `- app.ts/server.ts
|- frontend/
|  |- app/
|  |  |- page.tsx
|  |  |- login/page.tsx
|  |  |- signup/page.tsx
|  |  |- borrower/apply/page.tsx
|  |  |- borrower/loan/page.tsx
|  |  |- dashboard/page.tsx
|  |  |- not-found.tsx
|  |  `- globals.css
|  |- components/         app shell, access state, UI primitives, dialog, and toasts
|  |- public/logo.svg
|  `- lib/                API client, auth context, formatting, validation, and types
|- PRD.md
|- TRD.md
|- README.md
|- TESTING_GUIDE.md
`- VIDEO_DEMO_GUIDE.md
```

Controllers are intentionally thin. Business rules live in services and are repeated at the final server boundary even when the frontend has already validated the same field.

## 4. Runtime configuration

### Backend `.env`

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/creditsea_lms
JWT_SECRET=replace-with-a-long-local-secret
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:3000
IMGBB_API_KEY=replace-with-your-imgbb-api-key
```

The backend also provides development fallbacks for MongoDB, JWT secret, port, frontend URL, and JWT lifetime. A real deployment must provide explicit secrets and service configuration.

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

Only the API base URL is exposed to the browser. Secrets, including the ImgBB key and JWT secret, remain backend-only.

## 5. API application behavior

The Express application:

1. Applies Helmet.
2. Enables CORS for the configured frontend origins with credentials.
3. Accepts JSON bodies up to 1 MB and URL-encoded bodies.
4. Exposes `GET /health` as a liveness alias and `GET /api/v1/health` as the versioned health endpoint.
5. Mounts versioned application routes under `/api/v1/auth`, `/api/v1/borrower`, and `/api/v1/ops`. `/api` is not an application base path.
6. Serves OpenAPI documentation at `/api-docs` and `/api-docs.json`.
7. Normalizes unknown routes and errors through centralized middleware.

The frontend API client sends credentials by default, disables caching for application requests, applies a 10-second timeout, and converts non-2xx responses into `ApiError` instances.

### Interactive API documentation

The backend exposes an OpenAPI 3.0.3 contract served from `backend/src/config/swagger.ts`:

- Swagger UI: `GET /api-docs`
- Raw specification: `GET /api-docs.json`
- Swagger UI keeps authorization state for the current browser session and enables Try it out by default.
- `POST /api/v1/auth/signup` and `POST /api/v1/auth/login` document and set the `creditsea_access_token` HttpOnly cookie.
- Protected operations declare both `cookieAuth` and `bearerAuth`. Cookie authentication is the normal browser flow; Bearer authentication is the compatibility option for API clients.
- Request schemas document the PAN and UTR patterns, epoch-millisecond timestamp format, amount and tenure bounds, file limits, pagination parameters, status filters, and required rejection reasons.
- Responses include examples for successful reads/writes, validation failures, authorization failures, conflicts, missing resources, and external file-hosting errors.

The documentation routes are intentionally read-only and do not expose application data without using the protected API operations. The API's existing authentication middleware and RBAC middleware remain the enforcement layer.

## 6. Authentication and authorization

### 6.1 Token and cookie

The JWT payload contains:

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "BORROWER"
}
```

The backend sets the `creditsea_access_token` cookie with:

- `HttpOnly` enabled.
- `SameSite=Lax`.
- `Secure` enabled in production.
- A one-day default maximum age.
- Root path scope.

The auth middleware reads the cookie manually and accepts `Authorization: Bearer <token>` for direct API clients. It verifies signature, expiry, subject, email, and role before attaching the trusted identity to the request.

### 6.2 Roles

```text
ADMIN
SALES
SANCTION
DISBURSEMENT
COLLECTION
BORROWER
```

`authorizeRoles` is applied to every protected route. Borrower routes require `BORROWER`; operations routes allow only the owning role and `ADMIN`.

### 6.3 Frontend session behavior

`AuthProvider` loads `/auth/me` on startup, stores the public user in React state, and exposes login, signup, logout, and `updateUser` actions. Profile saves merge the returned borrower fields into this state so the AppShell navbar updates immediately. The AppShell provides authenticated navigation and logout handling; direct role mismatches render `UnauthorizedState`, while unknown paths render the global `not-found.tsx` page.

## 7. Data model

All application-managed MongoDB schemas use `versionKey: false`. Date/time values are stored as numeric Unix epoch milliseconds. Mongoose `createdAt` and `updatedAt` timestamps use the same numeric format.

### 7.1 `users`

```ts
{
  _id: ObjectId,
  email: string,                  // unique, lowercased, trimmed
  passwordHash: string,           // select: false
  role: 'ADMIN' | 'SALES' | 'SANCTION' | 'DISBURSEMENT' | 'COLLECTION' | 'BORROWER',
  fullName?: string,
  pan?: string,                   // stored uppercase
  dateOfBirth?: number,           // epoch milliseconds
  monthlySalary?: number,
  employmentMode?: 'SALARIED' | 'SELF_EMPLOYED' | 'UNEMPLOYED',
  profileCompleted: boolean,
  createdAt: number,              // epoch milliseconds
  updatedAt: number               // epoch milliseconds
}
```

`email` has unique and lookup indexes. Profile data remains on the user because the Sales module needs to list borrowers who have no loan application.

### 7.2 `loans`

```ts
{
  _id: ObjectId,
  borrowerId: ObjectId,
  amount: number,
  tenureDays: number,
  interestRate: number,           // currently 12
  simpleInterest: number,
  totalRepayment: number,
  totalPaid: number,
  status: 'APPLIED' | 'SANCTIONED' | 'REJECTED' | 'DISBURSED' | 'CLOSED',
  rejectionReason?: string,
  salarySlip: {
    url: string,
    deleteUrl?: string,
    originalName: string,
    mimeType: 'application/pdf' | 'image/jpeg' | 'image/png',
    sizeBytes: number
  },
  sanctionedBy?: ObjectId,
  sanctionedAt?: number,
  disbursedBy?: ObjectId,
  disbursedAt?: number,
  closedAt?: number,
  createdAt: number,
  updatedAt: number
}
```

Indexes:

- `borrowerId` for borrower loan lookup.
- `status` for work queues.
- Compound `{ status: 1, createdAt: -1 }` for ordered queues.

The service blocks a new application when the borrower has an `APPLIED`, `SANCTIONED`, or `DISBURSED` loan.

### 7.3 `payments`

```ts
{
  _id: ObjectId,
  loanId: ObjectId,
  borrowerId: ObjectId,
  utr: string,                    // globally unique, stored uppercase
  amount: number,
  paymentDate: number,            // epoch milliseconds
  recordedBy: ObjectId,
  createdAt: number,              // epoch milliseconds
  updatedAt: number               // epoch milliseconds
}
```

Indexes:

- `loanId` for payment history.
- `borrowerId` for ownership queries.
- Unique `utr` for duplicate protection.

## 8. Time and document-version policy

### 8.1 Epoch timestamps

`backend/src/utils/epoch.ts` provides:

- `nowEpoch()`: returns `Date.now()` in epoch milliseconds.
- `toEpoch(value)`: normalizes a Date, numeric epoch, numeric string, or parseable date string to an epoch number.

The backend writes epoch numbers for:

- User date of birth, `createdAt`, and `updatedAt`.
- Loan sanction, disbursement, closure, `createdAt`, and `updatedAt` timestamps.
- Payment date, `createdAt`, and `updatedAt` timestamps.

The frontend converts date-input values to epoch milliseconds before API requests and converts epoch values back to date-input or display strings when rendering.

### 8.2 Removing `__v`

The User, Loan, Payment, and embedded salary-slip schemas disable Mongoose's version key. On database connection, the migration routine:

- Converts legacy BSON Date values in known timestamp fields to epoch milliseconds.
- Removes legacy `__v` from users, loans, and payments.
- Removes legacy `salarySlip.__v` values from loans.

This keeps existing data compatible with the numeric timestamp and no-version-key policy.

## 9. Validation and business services

### 9.1 Shared constants

```ts
PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/
UTR_REGEX = /^(?=.{6,30}$)[A-Z0-9]+(?:-[A-Z0-9]+)*$/
```

The constants are shared by backend validation and the eligibility service. The frontend keeps equivalent regexes and help text for browser validation and guidance.

### 9.2 Eligibility service

`evaluateEligibility`:

1. Converts the supplied date of birth to a Date for calculation.
2. Rejects missing, invalid, or future dates.
3. Calculates age using the calendar birthday rather than an approximate millisecond difference.
4. Requires age 23-50 inclusive.
5. Requires monthly salary of at least INR 25,000.
6. Normalizes PAN to uppercase and checks `PAN_REGEX`.
7. Rejects `UNEMPLOYED` and missing employment mode.
8. Returns `{ eligible: boolean, errors: string[] }`.

The service runs for profile reads, profile updates, and final loan creation.

### 9.3 Loan calculation service

```ts
const simpleInterest = roundMoney((amount * 12 * tenureDays) / (365 * 100));
const totalRepayment = roundMoney(amount + simpleInterest);
```

Loan values are validated before calculation: amount `50000..500000`, tenure `30..365`. The frontend uses the same formula for its live preview; the backend values are persisted.

### 9.4 Payment service

The payment workflow is:

1. Load a loan whose status is `DISBURSED`.
2. Check the UTR for an existing payment.
3. Calculate the rounded outstanding balance.
4. Reject a non-positive amount or overpayment through request/model validation and service checks.
5. Atomically update the loan only when its status and previous `totalPaid` still match.
6. Set `CLOSED` and `closedAt` when the new paid total equals the repayment total.
7. Create the payment record with `toEpoch(paymentDate)`.
8. If payment creation fails, restore the loan's previous paid amount and disbursed status. MongoDB's unique UTR index remains the final duplicate-protection layer.

## 10. File handling

Multer uses memory storage, accepts one file, and enforces a 5 MB limit. The MIME allowlist is:

```text
application/pdf
image/jpeg
image/png
```

The file service uploads the bytes to ImgBB with a 30-second timeout. It stores the hosted URL, optional deletion URL, original filename, MIME type, and byte size on the loan. Salary-slip preview requests retrieve the hosted file through the backend and return it inline with its original MIME type.

## 11. REST API contract

All application endpoints below are prefixed with `/api/v1`.

### 11.1 Response and error conventions

Successful responses use the resource-specific JSON described below. Errors are normalized to:

```json
{
  "message": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "errors": []
}
```

Validation errors may contain objects with `field` and `message`. The main status mappings are:

| Status | Meaning |
|---:|---|
| 200 | Successful read or update |
| 201 | Successful creation |
| 204 | Successful logout with no response body |
| 401 | Missing, invalid, or expired authentication |
| 403 | Authenticated user lacks the required role or module access |
| 404 | Resource or route not found |
| 409 | Duplicate value, active-loan conflict, or invalid state transition |
| 422 | Invalid input, failed BRE, file validation, overpayment, or invalid pagination |
| 502/503/504 | External salary-slip hosting failure |
| 500 | Unexpected server failure |

### 11.2 Authentication routes

| Method | Route | Access | Behavior |
|---|---|---|---|
| POST | `/auth/signup` | Public | Validates email/password, creates a borrower, sets the auth cookie, returns `{ user }`. |
| POST | `/auth/login` | Public | Verifies credentials, sets the auth cookie, returns `{ user }`. |
| POST | `/auth/logout` | Public | Clears the auth cookie and returns `204`. |
| GET | `/auth/me` | Authenticated | Returns the current public user. |

### 11.3 Borrower routes

| Method | Route | Access | Behavior |
|---|---|---|---|
| GET | `/borrower/profile` | Borrower | Returns `{ profile, eligibility }`. |
| PUT | `/borrower/profile` | Borrower | Validates and saves profile fields, returns `{ profile, eligibility }`. |
| POST | `/borrower/loans/apply` | Borrower | Accepts multipart `salarySlip`, `amount`, and `tenureDays`; reruns eligibility and creates an `APPLIED` loan. |
| GET | `/borrower/loans/current` | Borrower | Returns the borrower's latest loan with financial summary and public salary-slip metadata. |
| GET | `/borrower/loans/current/salary-slip` | Borrower | Retrieves the latest salary slip through an authenticated inline response. |

### 11.4 Operations routes

| Method | Route | Access | Behavior |
|---|---|---|---|
| GET | `/ops/sales/leads` | Sales/Admin | Returns borrower accounts with no loan application. |
| GET | `/ops/sanction/loans` | Sanction/Admin | Returns paginated `APPLIED` loans. |
| GET | `/ops/sanction/history` | Sanction/Admin | Returns sanction history filtered by `SANCTIONED`, `REJECTED`, `DISBURSED`, or `CLOSED`. |
| PATCH | `/ops/loans/:id/sanction` | Sanction/Admin | Approves or rejects an `APPLIED` loan; rejection requires a reason. |
| GET | `/ops/disbursement/loans` | Disbursement/Admin | Returns paginated `SANCTIONED` loans. |
| GET | `/ops/disbursement/history` | Disbursement/Admin | Returns `DISBURSED` or `CLOSED` history. |
| PATCH | `/ops/loans/:id/disburse` | Disbursement/Admin | Changes a `SANCTIONED` loan to `DISBURSED`. |
| GET | `/ops/collection/loans` | Collection/Admin | Returns paginated `DISBURSED` loans ready for payment. |
| GET | `/ops/collection/history` | Collection/Admin | Returns disbursed or closed loans with at least one payment and their payment records. |
| POST | `/ops/loans/:id/payments` | Collection/Admin | Validates and records a payment, possibly closing the loan. |
| GET | `/ops/loans/:id` | Admin or owning operations role | Returns a loan only when its status belongs to the caller's operational module. |
| DELETE | `/ops/borrowers/:id` | Admin only | Deletes a borrower only when no loan document exists for the account. |
| DELETE | `/ops/loans/:id` | Admin only | Deletes only `APPLIED` or `REJECTED` applications with no payment history. |

List endpoints accept `page`, `pageSize`, and an optional case-insensitive `search` value up to 100 characters. Search matches borrower name, email, PAN, or a complete loan ID; collection endpoints also match payment UTR. The default page size is 10 and the maximum is 50. History endpoints accept the status filters documented above.

### Administrative deletion policy

Administrative deletion is deliberately limited to non-financial cleanup:

- `DELETE /ops/borrowers/:id` requires `ADMIN` and rejects any borrower with loan history using `BORROWER_HAS_LOAN_HISTORY`.
- `DELETE /ops/loans/:id` requires `ADMIN` and allows only `APPLIED` or `REJECTED` loans with zero payment history.
- Disbursed and closed loans, loans with payments, and payment documents themselves are not deletable through the API.
- A deleted loan's hosted salary slip is removed on a best-effort basis after the database record is deleted.
- Both routes validate the ObjectId path parameter and return `401`, `403`, `404`, or `409` as appropriate.

## 12. Frontend implementation

### 12.1 Shared client infrastructure

- `apiFetch` builds requests from `NEXT_PUBLIC_API_URL`, includes cookies, applies a timeout, and normalizes API errors.
- `apiFetchBlob` is used for protected salary-slip previews.
- `AuthProvider` owns the authenticated user and exposes `updateUser` for immediate local profile synchronization.
- `AppShell` provides guarded navigation, role labels, responsive layout, logout behavior, and the authenticated navbar.
- `ToastProvider` renders up to four transient success, error, or info notifications and dismisses them automatically.
- `InfoTooltip` uses an information button with accessible tooltip semantics. PAN and UTR guidance is fixed at the bottom-right of the viewport.
- `format.ts` converts epoch milliseconds to display dates and HTML date-input values, and provides INR and loan-calculation formatting.
- `components/access-state.tsx` provides the reusable branded 403 state for authenticated users who open a workspace outside their role.
- `app/not-found.tsx` provides the branded 404 state for unknown frontend routes.

### 12.2 Borrower application

The application page keeps step data in local state until the final multipart submit. It provides:

- Client-side PAN pattern validation and help tooltip.
- Server-returned eligibility errors.
- Local file type/size validation and an object-URL preview.
- Amount and tenure range sliders.
- Live simple-interest and repayment calculation.
- Loading and toast feedback for profile saves, file selection, eligibility results, and application submission.

### 12.3 Operations dashboard

The dashboard determines visible modules from the authenticated role. Administrators can switch between Sales, Sanction, Disbursement, and Collection. Other operations users are directed to their owning module.

The dashboard supports:

- Paginated active queues.
- Debounced search across borrower name, email, PAN, complete loan ID, and collection payment UTR.
- Approval and rejection with required rejection reason.
- Disbursement action.
- Payment entry with UTR, amount, and payment date.
- UTR browser validation and bottom-right format tooltip.
- Partial-payment messaging.
- Status-filtered history and recorded payment lists.
- Admin-only cleanup buttons for open borrower leads, applied applications, and rejected applications.
- Toasts and inline messages after every read or write action.

## 13. Seeded local accounts

`npm run seed` upserts one local account for each role. Every seeded account uses the password `Password123!`:

| Role | Email |
|---|---|
| Admin | `admin@lms.test` |
| Sales | `sales@lms.test` |
| Sanction | `sanction@lms.test` |
| Disbursement | `disbursement@lms.test` |
| Collection | `collection@lms.test` |
| Borrower | `borrower@lms.test` |

These accounts are for local operation and should be replaced or disabled in a production deployment.

## 14. Local operation

### Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Start the backend

```bash
cd backend
npm run dev
```

### Start the frontend

```bash
cd frontend
npm run dev
```

### Seed local accounts

```bash
cd backend
npm run seed
```

### Production builds

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

## 15. Verification requirements

### Backend checks

- Verify age boundaries, future date rejection, salary boundary, PAN format, and employment-mode rules.
- Verify loan amount and tenure boundaries and the simple-interest formula.
- Verify invalid file type, file size, and missing-file responses.
- Verify duplicate email and duplicate UTR responses.
- Verify overpayment rejection and automatic closure on exact repayment.
- Verify only Admin can delete an open borrower lead or non-financial application.
- Verify borrower deletion is rejected when any loan history exists.
- Verify disbursed, closed, and paid loans cannot be deleted.
- Verify invalid status transitions and concurrent payment conflicts.
- Verify role isolation: unauthorized operations routes return `403`; unauthenticated routes return `401`.
- Verify persisted date fields are numeric epoch values and application documents do not contain `__v`.

### Frontend checks

- Verify auth restoration, correct entry routing, role-mismatch 403 states, branded 404 behavior, and logout fallback behavior.
- Verify profile save updates the navbar name without reload.
- Verify PAN and UTR tooltips appear at the bottom-right and the input guidance is accessible by keyboard focus.
- Verify toast feedback for login, signup, logout, profile save, file selection, application submission, operational actions, and errors.
- Verify borrower loan display and protected salary-slip preview.
- Verify pagination, empty states, history filters, and payment balance updates.

## 16. Known technical boundaries

- Payment recording uses an atomic conditional loan update plus compensating rollback rather than a MongoDB multi-document transaction. The unique UTR index and state checks are required for integrity.
- ImgBB is the current external file host; a production deployment may replace it with managed object storage without changing the borrower-facing contract.
- The system currently has no scheduled jobs, notification worker, repayment schedule engine, or configurable lending-product catalog.
