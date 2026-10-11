# CreditSea Loan Management System

## Project testing guide

This guide verifies the complete CreditSea journey: borrower onboarding, BRE failure and success, loan application, sanction, disbursement, repayment, automatic closure, role protection, administration controls, API documentation, and frontend feedback states.

## 1. Prerequisites

- Node.js 18 or newer.
- A reachable MongoDB deployment, local or Atlas.
- A MongoDB database user with a valid connection string.
- An ImgBB API key for salary-slip upload and protected preview testing.
- A PDF, JPG, or PNG salary slip smaller than 5 MB.
- Two browser windows or profiles if you want to keep borrower and operations sessions open at the same time.

Do not commit `backend/.env`, `frontend/.env.local`, database credentials, JWT secrets, or ImgBB keys. The repository keeps `.env.example` templates for both applications.

## 2. Configure the environment

### Backend

Copy `backend/.env.example` to `backend/.env` and set values similar to:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/creditsea_lms
JWT_SECRET=use-a-long-random-local-secret
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:3000
IMGBB_API_KEY=your-imgbb-api-key
```

Salary slips are held in memory during the request and uploaded to ImgBB. They are not written to `backend/uploads`.

For MongoDB Atlas, confirm that:

1. The database user exists and its password is correct.
2. The current IP address is allowed in Network Access.
3. Special characters in the password are URL-encoded in `MONGODB_URI`.
4. The selected database is the one intended for local project testing.

### Frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

The `/api/v1` suffix is required. `/api` is not the application API base path.

Restart the frontend whenever `.env.local` changes.

## 3. Install, seed, and start

Open two PowerShell terminals.

### Terminal 1: backend

```powershell
cd "E:\Interview Projects\CreditSea Assignment\backend"
npm install
npm run seed
npm run dev
```

The backend should listen on `http://localhost:5000`.

### Terminal 2: frontend

```powershell
cd "E:\Interview Projects\CreditSea Assignment\frontend"
npm install
npm run dev
```

Open `http://localhost:3000`.

### Health checks

Both health URLs should return HTTP 200:

```powershell
Invoke-WebRequest http://localhost:5000/health
Invoke-WebRequest http://localhost:5000/api/v1/health
```

The first is a liveness alias. The second is the versioned health route used by the application contract.

## 4. Seeded project accounts

`npm run seed` upserts one local account for each role. Every seeded account uses:

```text
Password123!
```

| Role | Email | Workspace |
| --- | --- | --- |
| Admin | `admin@lms.test` | All operations modules and Administrator controls |
| Sales | `sales@lms.test` | Sales open borrower leads |
| Sanction | `sanction@lms.test` | Sanction pending review and decision history |
| Disbursement | `disbursement@lms.test` | Disbursement queue and history |
| Collection | `collection@lms.test` | Repayment queue and payment history |
| Borrower | `borrower@lms.test` | Application and My loan |

Use a new borrower email for a clean end-to-end run if the seeded borrower already has loan history. The seed command does not delete existing loans or payments.

## 5. Public route and session checks

1. Open `http://localhost:3000` while logged out.
2. Confirm the landing page, logo, Sign in button, and Create borrower account link render.
3. Open Sign in and confirm invalid credentials show an inline error and an error toast.
4. Create a new borrower account with a unique email.
5. Confirm signup creates a session and opens the borrower application.
6. Open browser storage tools and confirm authentication is held in the API-owned HttpOnly cookie named `creditsea_access_token`; no authentication token is stored in local storage.
7. Refresh the page and confirm `/api/v1/auth/me` restores the session.
8. Log out and confirm the user is returned to Sign in even if the API logout request is unavailable.

## 6. Frontend 404 and 403 checks

### Designed 404 state

1. While logged out, open `http://localhost:3000/this-route-does-not-exist`.
2. Confirm the branded 404 page shows the CreditSea logo, a Page not found message, and Home and Sign in actions.
3. Confirm both actions navigate to the expected routes.

### Designed 403 state

1. Sign in as `borrower@lms.test` and open `/dashboard` directly.
2. Confirm the operations dashboard is not rendered and a 403 Operations access is required state appears.
3. Use its Open borrower portal action and confirm it opens `/borrower/apply`.
4. Log out and sign in as an operations user, then open `/borrower/apply` and `/borrower/loan` directly.
5. Confirm each page shows a 403 borrower-portal state with a link to `/dashboard`.
6. Confirm the API still enforces the same rule. A frontend state is only navigation feedback; it is not the security boundary.

## 7. Complete borrower-to-closure flow

Run the following in order. Use a unique borrower account if the account already has an active loan.

### Step A: demonstrate a BRE failure

1. Sign in as a borrower and open **Application**.
2. Enter an intentionally ineligible profile, such as:
   - A valid PAN, for example `ABCDE1234F`.
   - An age outside 23 through 50 years.
   - Monthly salary below `25000`.
   - Employment mode `Unemployed`.
3. Click **Save and continue**.
4. Confirm the profile can be saved, but the page shows the complete eligibility error list.
5. Confirm an error toast says the eligibility check failed and the flow remains on Personal details.
6. Confirm the PAN information button explains the required 10-character format and the tooltip appears at the bottom-right of the viewport.

### Step B: pass the BRE and verify the navbar

1. Correct the profile with:
   - Full name, for example `Aarav Sharma`.
   - PAN matching `^[A-Z]{5}[0-9]{4}[A-Z]$`, for example `ABCDE1234F`.
   - A valid date of birth that makes the borrower 23 through 50 years old.
   - Monthly salary of at least `25000`.
   - Employment mode `Salaried` or `Self-employed`.
2. Save the profile again.
3. Confirm the eligibility result is successful and a success toast appears.
4. Confirm the borrower name and initial in the navbar update immediately without a full page reload.
5. Confirm the flow advances to Salary slip.

### Step C: upload the salary slip and submit the loan

1. Select a PDF, JPG, or PNG salary slip smaller than 5 MB.
2. Confirm the chosen filename and inline preview appear.
3. Try an unsupported file or a file over 5 MB and confirm it is rejected with an inline error and toast.
4. Continue to Loan configuration.
5. Choose an amount from `50000` through `500000`.
6. Choose a tenure from 30 through 365 days.
7. Confirm the live calculation uses:

   ```text
   Simple interest = Principal x 12 x TenureDays / (365 x 100)
   Total repayment = Principal + Simple interest
   ```

8. Submit the application.
9. Confirm the action is disabled during submission, a success toast appears, and the application opens in **My loan** with status `Applied`.
10. Confirm a borrower with an `Applied`, `Sanctioned`, or `Disbursed` loan cannot create another active application.

### Step D: verify My loan

1. Open **My loan**.
2. Confirm the status, amount, tenure, interest, total repayment, total paid, and outstanding balance are visible.
3. Confirm dates display as readable dates even though the API stores them as epoch milliseconds.
4. Confirm the salary slip appears in the protected preview area.
5. Open **Preview slip** and confirm the full PDF or image is shown in the modal.
6. Confirm no hosted ImgBB management URL is displayed in the frontend.

### Step E: approve or reject in Sanction

1. Log out and sign in as `sanction@lms.test`.
2. Confirm the Sanction workspace opens without showing modules owned by other roles.
3. Confirm the applied loan appears in the pending queue.
4. Use the tab-specific search field with the borrower name, email, PAN, or complete loan ID.
5. Approve the loan.
6. Confirm the action is disabled while saving, a success toast appears, and the loan leaves the pending queue.
7. Open **Decision history** and confirm the loan has status `Sanctioned`.
8. Verify history filters for All, Sanctioned, Rejected, Disbursed, and Closed.

Optional rejection path:

1. Submit a second application from another borrower account.
2. Select Reject in Sanction.
3. Confirm rejection cannot be submitted without a reason.
4. Enter a reason and confirm the loan moves to `Rejected` history.
5. Confirm the borrower can see the rejection reason and can submit a new application because rejected loans do not count as active loans.

### Step F: disburse in Disbursement

1. Log out and sign in as `disbursement@lms.test`.
2. Confirm the sanctioned loan appears in the pending queue.
3. Search using the Disbursement-specific search field.
4. Select **Mark as disbursed**.
5. Confirm the button shows a loading state and is disabled during the request.
6. Confirm a success toast appears and the status becomes `Disbursed`.
7. Open **Disbursement history** and test All, Disbursed, and Closed filters.

### Step G: record repayment and close the loan

1. Log out and sign in as `collection@lms.test`.
2. Confirm the disbursed loan appears in the repayment queue.
3. Enter a unique UTR such as `DEMO-UTR-001`.
4. Confirm the UTR information tooltip explains the 6-30 character rule and appears at the bottom-right.
5. Enter a payment amount smaller than the outstanding balance and choose a payment date.
6. Confirm the payment date is submitted from the date input and is persisted as an epoch value.
7. Record the payment and confirm the outstanding balance decreases.
8. Record another payment with a different UTR using the exact remaining balance.
9. Confirm the loan changes from `Disbursed` to `Closed` and the outstanding balance becomes zero.
10. Open **Payment history** and confirm the UTR, amount, payment date, loan status, search field, pagination, and status filters are correct.

## 8. Operations search, pagination, and loading behavior

Test each search field independently because every tab has its own search state and search scope:

| Module/tab | Search values to verify |
| --- | --- |
| Sales | Borrower name, email, PAN |
| Sanction pending | Borrower name, email, PAN, complete loan ID |
| Sanction history | Borrower name, email, PAN, complete loan ID |
| Disbursement pending | Borrower name, email, PAN, complete loan ID |
| Disbursement history | Borrower name, email, PAN, complete loan ID |
| Collection pending | Borrower name, email, PAN, complete loan ID, UTR |
| Collection history | Borrower name, email, PAN, complete loan ID, UTR |

For each tab:

1. Enter a search value and wait for the debounced request.
2. Confirm only matching records appear.
3. Switch to another tab and confirm its search field and results are independent.
4. Clear the search and confirm the full filtered list returns.
5. Create or seed enough records to exceed 10 results.
6. Confirm Previous, Next, page number, total count, and result range are correct.
7. Change a history status filter and confirm the page resets and reloads from the server.
8. Switch tabs rapidly and confirm stale responses do not replace the current tab's results.
9. Confirm only one stable loading overlay appears for a request; tabs and layout must not flicker.

## 9. Administrator controls

Sign in as `admin@lms.test`.

1. Confirm the dashboard exposes Sales, Sanction, Disbursement, and Collection.
2. Scroll to the end and open the collapsed **Administrator controls** section.
3. In Sales, confirm a borrower with no loan history can be deleted after confirmation.
4. Confirm the UI shows a success toast and refreshes the leads list after deletion.
5. In Sanction, confirm an `Applied` or `Rejected` application with no payment history can be deleted after confirmation.
6. Confirm disbursed, closed, or paid loans do not show a delete action.
7. Confirm the confirmation dialog explains the restriction and that deletion is irreversible.
8. Log in as a non-admin role and confirm admin delete controls are not rendered.
9. Call the same delete APIs using a non-admin session and confirm the backend returns HTTP 403.

Deletion rules are intentionally limited to non-financial cleanup:

- A borrower cannot be deleted once any loan history exists.
- Only `Applied` and `Rejected` loan applications without payment history can be deleted.
- Payments are not directly deletable.

## 10. Validation and error tests

- Submit an empty profile and confirm required-field validation.
- Use an invalid PAN and confirm both browser and server validation.
- Use an invalid UTR, a UTR shorter than 6 characters, a UTR longer than 30 characters, or a UTR with unsupported punctuation.
- Use a salary below `25000`, an invalid/future date of birth, or `Unemployed` employment mode and confirm BRE errors.
- Use amount or tenure outside the permitted ranges and confirm the API returns validation errors.
- Submit without a salary slip and confirm `SALARY_SLIP_REQUIRED` behavior.
- Upload an unsupported type or a file over 5 MB.
- Try to approve a loan twice and confirm the second action is rejected as an invalid transition.
- Try to disburse an unapplied or rejected loan and confirm the transition is rejected.
- Try to record a payment on an unapplied, sanctioned, or closed loan.
- Record a payment greater than the outstanding balance and confirm overpayment is rejected.
- Reuse an existing UTR and confirm the duplicate payment is rejected.
- Open `/api/v1/auth/me` without a session and confirm HTTP 401.
- Open another role's API route with a valid session and confirm HTTP 403.
- Request a non-existent API route and confirm the standard 404 error response.

## 11. API documentation and contract checks

Open `http://localhost:5000/api-docs` and confirm Swagger UI loads. The raw contract is available at `http://localhost:5000/api-docs.json`.

1. Confirm the server URL in the OpenAPI document is `/api/v1`.
2. Use Try it out on signup or login and confirm the `creditsea_access_token` cookie is set.
3. Call `/auth/me` from Swagger and confirm the public user response.
4. Confirm protected routes document both `cookieAuth` and `bearerAuth`.
5. Confirm request examples include profile, loan application, sanction, payment, pagination, and search payloads.
6. Confirm response examples cover success, validation, 401, 403, 404, 409, and external file-hosting failures.
7. Verify the documented PAN and UTR regex, epoch-millisecond fields, amount/tenure bounds, and status filters.

The browser application uses the HttpOnly cookie automatically. Bearer authentication exists for direct API clients and testing only.

## 12. Persistence checks: epoch timestamps and no `__v`

All application-managed timestamps must be numbers representing Unix epoch milliseconds. Mongoose version keys are disabled and legacy `__v` values are removed when the backend connects.

After running the flow, inspect MongoDB with `mongosh`:

```javascript
use creditsea_lms

db.users.findOne({}, { __v: 1, dateOfBirth: 1, createdAt: 1, updatedAt: 1 })
db.loans.findOne({}, { __v: 1, sanctionedAt: 1, disbursedAt: 1, closedAt: 1, createdAt: 1, updatedAt: 1 })
db.payments.findOne({}, { __v: 1, paymentDate: 1, createdAt: 1, updatedAt: 1 })
```

Confirm:

- The returned documents do not contain `__v`.
- Present timestamp fields are numeric values such as `1735689600000`, not BSON Date values or formatted strings.
- `closedAt` is present only after the final payment closes a loan.
- `paymentDate` is the epoch representation of the selected date.

The connection routine also migrates known legacy Date fields to epoch milliseconds and removes legacy version keys from users, loans, payments, and embedded salary-slip documents.

## 13. Troubleshooting

### Backend is not responding

```powershell
Invoke-WebRequest http://localhost:5000/api/v1/health
```

If this fails, check the backend terminal, `MONGODB_URI`, and whether port 5000 is available.

### MongoDB connection fails

- Confirm Atlas Network Access includes the current IP.
- Confirm the database user exists.
- URL-encode special characters in the MongoDB password.
- Confirm the connection string uses the expected `mongodb://` or `mongodb+srv://` format.

### Salary-slip upload fails

- Confirm `IMGBB_API_KEY` is present in `backend/.env`.
- Confirm the file is PDF, JPG, or PNG.
- Confirm the file is 5 MB or smaller.
- Confirm the backend can reach ImgBB.

### Frontend requests use the wrong path

Confirm `frontend/.env.local` contains:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

Restart the frontend and check the browser Network tab for requests beginning with `http://localhost:5000/api/v1`.

### Browser shows stale authentication

Log out first. If needed, clear site data for `localhost:5000` in browser developer tools and sign in again. The session cookie is HttpOnly and is owned by the API origin.

## 14. Build verification

Run both production builds from a clean dependency install:

```powershell
cd "E:\Interview Projects\CreditSea Assignment\backend"
npm install
npm run build

cd ..\frontend
npm install
npm run build
```

Both commands should complete without TypeScript or Next.js build errors.

## 15. Project readiness checklist

- [ ] Backend dependencies install successfully.
- [ ] Frontend dependencies install successfully.
- [ ] `/health` returns HTTP 200.
- [ ] `/api/v1/health` returns HTTP 200.
- [ ] Swagger UI and raw OpenAPI JSON load.
- [ ] Borrower signup and login work with the HttpOnly cookie.
- [ ] BRE failure and BRE success are both demonstrated.
- [ ] Borrower navbar name updates after profile save.
- [ ] Salary-slip validation, upload, and protected preview work.
- [ ] Loan application, sanction, disbursement, partial repayment, and final closure work.
- [ ] Search is independent in every operations tab.
- [ ] Pagination and history filters work.
- [ ] Loading overlays do not flicker during tab changes.
- [ ] Admin controls are visible only to Admin and enforce deletion restrictions.
- [ ] 404 and 403 frontend states are designed and navigable.
- [ ] Persisted timestamps are epoch numbers.
- [ ] No application document contains `__v`.
- [ ] No secrets are committed.
- [ ] Backend and frontend production builds pass.
