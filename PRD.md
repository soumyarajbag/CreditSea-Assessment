# CreditSea Loan Management System

## Product Requirements Document

**Product stage:** Core lending operations release  
**Document purpose:** Define the product experience, business rules, and operational behavior of CreditSea.

## 1. Product overview

CreditSea is a role-aware loan management platform for managing a borrower's journey from profile completion and eligibility checks through sanction, disbursement, repayment, and closure.

The platform gives each participant a focused workspace:

- Borrowers submit and track their own loan applications.
- Sales teams see registered borrowers who have not applied.
- Sanction teams review applications and record approval or rejection decisions.
- Disbursement teams mark sanctioned loans as released.
- Collection teams record repayments and monitor balances.
- Administrators can work across all operational stages.

CreditSea is designed around a single, traceable loan lifecycle. Each stage has a clear owner, a controlled status transition, and feedback in the interface when an action succeeds or fails.

## 2. Product objectives

1. Provide a clear borrower application journey with immediate, understandable eligibility feedback.
2. Keep lending operations separated by responsibility and enforce those boundaries at the API layer.
3. Preserve a consistent financial calculation for interest, total repayment, paid amount, and outstanding balance.
4. Make each handoff visible through status, history, timestamps, and role-specific work queues.
5. Prevent invalid data through server-side validation, unique payment references, controlled transitions, and safe upload handling.
6. Make the core workflow easy to operate on desktop and smaller screens without requiring training for common actions.

## 3. Users and responsibilities

| User | Product responsibility | Available workspace |
|---|---|---|
| Borrower | Create an account, complete personal details, pass the business rules engine, submit a loan, and monitor repayment status | Borrower application and My loan |
| Sales executive | Follow up with registered borrowers who have not submitted an application | Sales / Open leads |
| Sanction executive | Review applied loans and approve or reject them with a reason | Sanction / Pending review and Decision history |
| Disbursement executive | Release approved loans and review released-loan history | Disbursement / Pending disbursement and Disbursement history |
| Collection executive | Record repayments and review payment history | Collection / Pending repayments and Payment history |
| Administrator | Work across sales, sanction, disbursement, and collection modules | All operations modules |

The API is the source of truth for access control. Hiding a navigation item in the frontend does not grant or remove permission by itself.

## 4. Current product scope

### 4.1 Account access

- Public borrower signup with email and password.
- Login and logout for borrowers and operations users.
- Passwords are stored as bcrypt hashes.
- Authenticated sessions use a JWT in an HttpOnly cookie.
- Current-user lookup restores the session when the application is opened again.
- The authenticated entry flow directs borrowers to the borrower workspace and operations users to the operations dashboard. If an authenticated user opens a workspace owned by another role, the interface shows a designed 403 state with a link to the correct workspace instead of silently rendering the wrong module. Unknown URLs use a designed 404 page.

### 4.2 Borrower profile and eligibility

The borrower completes a three-step application experience:

1. Personal details and eligibility.
2. Salary-slip selection and preview.
3. Loan amount, tenure, calculation, and submission.

The business rules engine runs on the server when the profile is saved and again when the loan is submitted. A failed eligibility check displays each failed rule and prevents loan creation.

When a borrower saves a new name, the returned profile is merged into the authenticated user state immediately. The name and avatar initial in the navbar update without a page reload.

### 4.3 Loan application

- A borrower can have at most one active loan at a time.
- A salary slip is required before the application can be submitted.
- The frontend validates the file type and size before upload; the backend validates it again.
- The final application is submitted as multipart form data.
- A successful application is created with `APPLIED` status.
- The borrower can view the current loan, calculations, status, balance, and a protected salary-slip preview.

### 4.4 Operations workspaces

Operations screens are role-aware and provide:

- Paginated lists with a default page size of 10 and a maximum page size of 50.
- Search across borrower name, email, PAN, and a complete loan ID; collection views also support payment UTR search.
- Empty, loading, inline error, and success states.
- Sanction, disbursement, and collection history views where applicable.
- Status filters for historical records.
- One primary action per actionable loan.
- Toast feedback for successful actions and API failures.
- Search state is isolated by module and history tab, so a search in Sales does not affect Sanction, Disbursement, or Collection views.

Administrators also have controlled cleanup actions:

- Delete a borrower account only when the borrower has no loan history.
- Delete an `APPLIED` or `REJECTED` loan application only when it has no payment history.
- Financial records that are `DISBURSED` or `CLOSED` cannot be deleted.
- These actions are exposed in a dedicated, collapsed Administrator controls section at the end of the dashboard and require confirmation before submission.

### 4.5 Repayment tracking

Collection users can record one or more payments against a disbursed loan. The interface shows total repayment, total paid, and outstanding balance. When a payment exactly clears the balance, the system changes the loan to `CLOSED` automatically.

## 5. End-to-end loan journey

```text
Borrower signup
      |
      v
Personal details saved
      |
      +--> BRE fails: show failed rules; do not allow application
      |
      +--> BRE passes
              |
              v
Salary slip + loan configuration submitted
              |
              v
           APPLIED
              |
       Sanction decision
        /             \
       v               v
  SANCTIONED        REJECTED
       |
       v
  DISBURSED
       |
       v
  Payments recorded
       |
       v
    CLOSED
```

`REGISTERED` is a lead condition used by the Sales module. It is not a persisted loan status.

## 6. Business rules

### 6.1 Borrower eligibility rules

All rules are evaluated by the backend. The frontend may provide browser-level feedback, but the backend result controls whether an application can be created.

| Field | Rule |
|---|---|
| Age | The borrower must be 23 through 50 years old, inclusive. Age is calculated from the date of birth and the current date. |
| Date of birth | Required, valid, and not in the future. |
| Monthly salary | Must be at least INR 25,000. |
| PAN | After trimming and uppercasing, must match `^[A-Z]{5}[0-9]{4}[A-Z]$`. Example: `ABCDE1234F`. |
| Employment mode | `SALARIED` or `SELF_EMPLOYED` is allowed. `UNEMPLOYED` is not eligible. |

The PAN information button explains: "Use 10 characters: 5 uppercase letters, 4 digits, then 1 uppercase letter. Example: ABCDE1234F."

Saving an ineligible profile is allowed so the borrower can see the complete list of issues and correct the details. Loan creation remains blocked until all rules pass.

### 6.2 Loan configuration and calculation

| Field | Rule |
|---|---|
| Amount | INR 50,000 through INR 5,00,000, inclusive. |
| Tenure | 30 through 365 days, inclusive. |
| Interest rate | Fixed at 12% per annum for the current product release. |

The simple-interest calculation is:

```text
Simple interest = (Principal x 12 x TenureDays) / (365 x 100)
Total repayment = Principal + Simple interest
```

Money values are rounded to two decimal places. The frontend updates the calculation panel as the amount or tenure slider moves; the backend recalculates and stores the authoritative values.

### 6.3 Salary slip

- Accepted formats: PDF, JPG, and PNG.
- Maximum size: 5 MB.
- The backend receives the file in memory and uploads it to Cloudinary.
- The loan stores the hosted URL and file metadata.
- The public loan response exposes file metadata but not the hosted management URLs.
- A borrower can request a protected inline preview through the backend.
- If hosting fails, the loan is not created. Any uploaded hosted file is cleaned up on a best-effort basis when database creation fails.

### 6.4 Loan status transitions

| Transition | Owner | Required behavior |
|---|---|---|
| Create `APPLIED` | Borrower | Profile passes the BRE, a valid salary slip is present, and amount/tenure are valid. |
| `APPLIED` -> `SANCTIONED` | Sanction / Admin | Approve the application and record the decision user and time. |
| `APPLIED` -> `REJECTED` | Sanction / Admin | Reject the application and provide a reason. |
| `SANCTIONED` -> `DISBURSED` | Disbursement / Admin | Mark the funds as released and record the operator and time. |
| `DISBURSED` -> `CLOSED` | System | Set automatically when the rounded paid amount equals the repayment total. |

Only `APPLIED`, `SANCTIONED`, and `DISBURSED` block another application for the same borrower. `REJECTED` and `CLOSED` loans do not block a new application.

Invalid or repeated transitions are rejected by the backend.

### 6.5 Payments

Each payment requires:

- A globally unique UTR.
- A positive amount.
- A payment date.
- A disbursed loan that is not already closed.

The UTR is normalized to uppercase and must match:

```text
^(?=.{6,30}$)[A-Z0-9]+(?:-[A-Z0-9]+)*$
```

This allows 6 to 30 letters and digits with optional single hyphens between groups. The UTR information button explains: "Use 6-30 characters with letters or digits. Hyphens are allowed between groups. Example: DEMO-UTR-001."

A payment greater than the current outstanding balance is rejected. The collection interface uses the current outstanding amount as the maximum input value and the backend performs the final check.

## 7. User experience requirements

### 7.1 Feedback

- Successful actions show a success toast.
- Failed API actions show an error toast and preserve an actionable inline message where the form needs correction.
- Loading states disable the active action and show a loader.
- Empty states explain what the user can do next.
- Toasts can be dismissed and expire automatically.
- Format guidance is available through information buttons. PAN and UTR tooltips are positioned at the bottom-right of the viewport so the guidance remains readable without changing the form layout.
- Unknown routes show a branded 404 page with links to Home and Sign in.
- Authenticated users who open a role-owned route without the required role see a branded 403 state with a link to their permitted workspace.

### 7.2 Navigation and identity

- The navbar shows the authenticated user's current name, role, and initial.
- Borrower profile changes update the navbar immediately after a successful save.
- Borrowers see Application and My loan navigation.
- Operations users see their permitted dashboard module; Administrators see all modules.
- Logout clears the local user state even if the server is temporarily unavailable, and the user is returned to login.

### 7.3 Responsive behavior

The interface supports desktop and mobile widths. Tables may scroll horizontally, operations actions remain usable on narrow screens, and borrower forms use a progressive three-step layout.

## 8. Product screens

1. Public landing page.
2. Borrower signup.
3. Login.
4. Borrower application: personal details and BRE result.
5. Borrower application: salary-slip selection and preview.
6. Borrower application: loan configuration and calculation.
7. Borrower My loan: status, financial summary, and salary-slip preview.
8. Operations dashboard: Sales open leads.
9. Operations dashboard: Sanction pending review and decision history.
10. Operations dashboard: Disbursement pending release and history.
11. Operations dashboard: Collection pending repayments and payment history.
12. Branded 404 page for unknown routes.
13. Branded 403 not-authorized state for role-mismatched workspace access.

## 9. Security and data protection requirements

- Borrowers can access only their own profile, current loan, and salary slip.
- Operations endpoints require authentication and role authorization.
- Password hashes and JWTs are never returned in public API responses.
- JWTs are stored in an HttpOnly cookie; frontend code does not use local storage for authentication.
- Salary-slip access is authenticated and proxied by the backend.
- API validation is repeated server-side for all business-critical fields.
- Uploaded salary slips are limited by type, count, and size.
- Frontend access states improve navigation feedback but do not replace backend authentication and RBAC enforcement.

## 10. Current release boundaries

The following capabilities are intentionally not part of the current release:

- Real bank transfer initiation or reconciliation.
- Configurable interest-rate products.
- Installment schedules and automated due-date reminders.
- Notifications by email, SMS, or WhatsApp.
- Multiple simultaneous active loans for one borrower.
- Password reset, refresh-token rotation, and enterprise identity federation.
- Exports, analytics, and a dedicated audit-log screen.

These boundaries keep the core lifecycle focused while leaving room for future product development.

## 11. Operational acceptance criteria

The product release is considered healthy when:

- A borrower can sign up, complete the profile, see a BRE failure, correct the details, pass the BRE, select a valid salary slip, and submit a loan.
- Sanction can approve or reject an applied loan, and rejection requires a reason.
- Disbursement can release a sanctioned loan.
- Collection can record a partial payment, see the reduced balance, and record the exact final balance.
- The final payment automatically changes the loan to `CLOSED` with zero outstanding balance.
- Duplicate UTRs, overpayments, invalid files, invalid fields, and invalid transitions are rejected.
- Unauthorized roles cannot use another role's API actions.
- Direct navigation to another role's frontend workspace shows the appropriate 403 state, while an unknown path shows the 404 page.
- Only administrators can access cleanup APIs; disbursed, paid, and closed records remain protected.
- User-facing success, error, loading, empty, tooltip, and navigation states behave consistently.

## 12. Recommended operational walkthrough

For a complete product walkthrough, use the following sequence:

1. Open the borrower workspace and sign in or create a borrower account.
2. Enter an intentionally ineligible profile to show the individual BRE errors.
3. Correct the profile and save it; confirm the navbar name updates immediately.
4. Select a valid salary slip and preview it.
5. Adjust amount and tenure, review the calculation, and submit the application.
6. In the Sanction module, approve the application.
7. In the Disbursement module, mark the loan as disbursed.
8. In the Collection module, record a partial payment and then the remaining balance.
9. Open history views and confirm the lifecycle and payment records.
10. Open an unknown URL to confirm the branded 404 state, then open a role-owned URL with the wrong account type to confirm the branded 403 state.
