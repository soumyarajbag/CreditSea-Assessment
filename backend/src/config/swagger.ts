const protectedRouteSecurity = [{ cookieAuth: [] }, { bearerAuth: [] }];

const errorResponse = (description: string, example: Record<string, unknown>) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
      example,
    },
  },
});

const jsonResponse = (description: string, schema: string, example: unknown) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: schema },
      example,
    },
  },
});

const paginationParameters = [
  {
    name: 'page',
    in: 'query',
    description: 'One-based page number.',
    required: false,
    schema: { type: 'integer', minimum: 1, default: 1 },
    example: 1,
  },
  {
    name: 'pageSize',
    in: 'query',
    description: 'Number of records per page. Maximum 50.',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
    example: 10,
  },
  {
    name: 'search',
    in: 'query',
    description:
      'Case-insensitive search. Matches borrower name, email, PAN, or a complete loan ID; collection endpoints also match payment UTR.',
    required: false,
    schema: { type: 'string', maxLength: 100 },
    example: 'Aarav',
  },
];

const unauthorizedResponse = errorResponse('Authentication is missing or invalid.', {
  message: 'Authentication is required.',
  code: 'UNAUTHENTICATED',
  errors: [],
});

const forbiddenResponse = errorResponse('The authenticated role cannot use this route.', {
  message: 'You do not have permission to perform this action.',
  code: 'FORBIDDEN',
  errors: [],
});

const validationResponse = errorResponse('The request body or query parameters are invalid.', {
  message: 'Validation failed.',
  code: 'VALIDATION_ERROR',
  errors: [{ field: 'pan', message: 'PAN must be 10 characters: 5 letters, 4 digits, then 1 letter.' }],
});

const userExample = {
  id: '671234567890abcdef123456',
  email: 'borrower@example.com',
  role: 'BORROWER',
  fullName: 'Aarav Sharma',
  pan: 'ABCDE1234F',
  dateOfBirth: 695433600000,
  monthlySalary: 65000,
  employmentMode: 'SALARIED',
  profileCompleted: true,
};

const loanExample = {
  id: '671234567890abcdef123999',
  borrowerId: '671234567890abcdef123456',
  borrower: {
    id: '671234567890abcdef123456',
    email: 'borrower@example.com',
    fullName: 'Aarav Sharma',
    pan: 'ABCDE1234F',
  },
  amount: 150000,
  tenureDays: 90,
  interestRate: 12,
  simpleInterest: 4438.36,
  totalRepayment: 154438.36,
  totalPaid: 0,
  outstandingBalance: 154438.36,
  status: 'APPLIED',
  rejectionReason: null,
  salarySlip: {
    originalName: 'salary-slip-january.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 245760,
  },
  sanctionedAt: null,
  disbursedAt: null,
  closedAt: null,
  createdAt: 1735689600000,
  updatedAt: 1735689600000,
  isClosed: false,
};

const paginationExample = {
  page: 1,
  pageSize: 10,
  total: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'CreditSea Loan Management API',
    version: '1.0.0',
    description: [
      'REST API for borrower onboarding, eligibility checks, loan operations, disbursement, and collections.',
      '',
      '## Authentication in Swagger UI',
      '',
      '1. Use **POST /auth/signup** or **POST /auth/login** with **Try it out**. The API sets the `creditsea_access_token` HttpOnly cookie.',
      '2. Because this documentation is served by the API, the browser sends that cookie automatically on later **Try it out** requests.',
      '3. Protected operations are marked with the `cookieAuth` and `bearerAuth` security schemes. The cookie is the normal browser flow; the Bearer scheme is available for API clients and direct testing.',
      '4. Role restrictions are enforced by the backend even if an endpoint is visible in the documentation.',
      '',
      'All date/time fields are Unix epoch milliseconds. PAN and UTR values are normalized to uppercase by the backend.',
    ].join('\n'),
    contact: {
      name: 'CreditSea API team',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current CreditSea API server',
    },
  ],
  tags: [
    { name: 'Health', description: 'Service availability.' },
    { name: 'Authentication', description: 'Signup, login, session lookup, and logout.' },
    { name: 'Borrower', description: 'Borrower profile, loan application, and protected salary-slip access.' },
    { name: 'Sales', description: 'Registered borrowers without a loan application.' },
    { name: 'Sanction', description: 'Loan review, decision, and sanction history.' },
    { name: 'Disbursement', description: 'Funds release and disbursement history.' },
    { name: 'Collection', description: 'Repayment recording, balances, and payment history.' },
    { name: 'Operations', description: 'Cross-module operation lookup.' },
    { name: 'Administration', description: 'Admin-only non-financial cleanup operations.' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API health',
        operationId: 'getHealth',
        responses: {
          200: {
            description: 'The API is available.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
                example: { status: 'ok', service: 'creditsea-lms-api' },
              },
            },
          },
        },
      },
    },
    '/auth/signup': {
      post: {
        tags: ['Authentication'],
        summary: 'Create a borrower account',
        description: 'Creates a BORROWER account and sets the `creditsea_access_token` HttpOnly cookie.',
        operationId: 'signup',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthCredentials' },
              example: { email: 'borrower@example.com', password: 'Password123!' },
            },
          },
        },
        responses: {
          201: {
            description: 'Borrower account created and session cookie set.',
            headers: {
              'Set-Cookie': {
                description: 'HttpOnly session cookie. Browsers store this automatically.',
                schema: { type: 'string' },
                example: 'creditsea_access_token=eyJhbGciOiJIUzI1NiJ9...; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax',
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
                example: {
                  user: {
                    ...userExample,
                    fullName: null,
                    pan: null,
                    dateOfBirth: null,
                    monthlySalary: null,
                    employmentMode: null,
                    profileCompleted: false,
                  },
                },
              },
            },
          },
          409: errorResponse('The email is already registered.', {
            message: 'An account with this email already exists.',
            code: 'EMAIL_ALREADY_EXISTS',
            errors: [],
          }),
          422: validationResponse,
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in and create a session',
        description: 'Verifies credentials and sets the `creditsea_access_token` HttpOnly cookie.',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthCredentials' },
              example: { email: 'borrower@example.com', password: 'Password123!' },
            },
          },
        },
        responses: {
          200: {
            description: 'Credentials accepted and session cookie set.',
            headers: {
              'Set-Cookie': {
                description: 'HttpOnly session cookie. Browsers store this automatically.',
                schema: { type: 'string' },
                example: 'creditsea_access_token=eyJhbGciOiJIUzI1NiJ9...; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax',
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
                example: { user: userExample },
              },
            },
          },
          401: errorResponse('Credentials were rejected.', {
            message: 'Email or password is incorrect.',
            code: 'INVALID_CREDENTIALS',
            errors: [],
          }),
          422: validationResponse,
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'End the current session',
        description:
          'Clears the `creditsea_access_token` cookie. The route is callable without authentication so an expired session can still be cleared.',
        operationId: 'logout',
        responses: {
          204: {
            description: 'Session cookie cleared. There is no response body.',
            headers: {
              'Set-Cookie': {
                description: 'Expired cookie sent by the API.',
                schema: { type: 'string' },
                example: 'creditsea_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
              },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get the current authenticated user',
        operationId: 'getCurrentUser',
        security: protectedRouteSecurity,
        responses: {
          200: jsonResponse('Current public user.', '#/components/schemas/AuthResponse', { user: userExample }),
          401: unauthorizedResponse,
        },
      },
    },
    '/borrower/profile': {
      get: {
        tags: ['Borrower'],
        summary: 'Read the borrower profile and eligibility result',
        operationId: 'getBorrowerProfile',
        security: protectedRouteSecurity,
        responses: {
          200: jsonResponse('Profile and current eligibility result.', '#/components/schemas/ProfileResponse', {
            profile: userExample,
            eligibility: { eligible: true, errors: [] },
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: errorResponse('The borrower account was not found.', {
            message: 'Borrower profile not found.',
            code: 'BORROWER_NOT_FOUND',
            errors: [],
          }),
        },
      },
      put: {
        tags: ['Borrower'],
        summary: 'Save borrower details and run the BRE',
        description:
          'Saves profile details and returns all eligibility errors. An ineligible profile can be saved for correction, but a loan cannot be created until eligibility passes.',
        operationId: 'updateBorrowerProfile',
        security: protectedRouteSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProfileUpdateRequest' },
              example: {
                fullName: 'Aarav Sharma',
                pan: 'ABCDE1234F',
                dateOfBirth: 695433600000,
                monthlySalary: 65000,
                employmentMode: 'SALARIED',
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Profile saved with the latest eligibility result.', '#/components/schemas/ProfileResponse', {
            profile: userExample,
            eligibility: { eligible: true, errors: [] },
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          422: validationResponse,
        },
      },
    },
    '/borrower/loans/apply': {
      post: {
        tags: ['Borrower'],
        summary: 'Submit a loan application',
        description:
          'Accepts a salary slip and loan configuration as multipart form data. The backend reruns eligibility, checks active-loan conflicts, uploads the salary slip, and creates an APPLIED loan.',
        operationId: 'applyForLoan',
        security: protectedRouteSecurity,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { $ref: '#/components/schemas/LoanApplicationRequest' },
              encoding: {
                salarySlip: { contentType: 'application/pdf, image/jpeg, image/png' },
              },
              example: {
                amount: 150000,
                tenureDays: 90,
                salarySlip: 'salary-slip-january.pdf',
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Loan application created with APPLIED status.', '#/components/schemas/LoanResponse', { loan: loanExample }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          409: errorResponse('The borrower already has an active loan.', {
            message: 'You already have an active loan application.',
            code: 'ACTIVE_LOAN_EXISTS',
            errors: [],
          }),
          422: errorResponse('The application, eligibility result, or salary slip is invalid.', {
            message: 'Borrower is not eligible to apply.',
            code: 'BRE_FAILED',
            errors: ['Monthly salary must be at least INR 25,000.'],
          }),
          503: errorResponse('ImgBB is not configured.', {
            message: 'Image hosting is not configured. Add IMGBB_API_KEY to the backend environment.',
            code: 'IMGBB_NOT_CONFIGURED',
            errors: [],
          }),
        },
      },
    },
    '/borrower/loans/current': {
      get: {
        tags: ['Borrower'],
        summary: 'Get the borrower latest loan',
        operationId: 'getBorrowerLoan',
        security: protectedRouteSecurity,
        responses: {
          200: jsonResponse('Latest borrower loan with balance summary.', '#/components/schemas/LoanResponse', { loan: loanExample }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: errorResponse('No loan was found for the borrower.', {
            message: 'No loan application found.',
            code: 'LOAN_NOT_FOUND',
            errors: [],
          }),
        },
      },
    },
    '/borrower/loans/current/salary-slip': {
      get: {
        tags: ['Borrower'],
        summary: 'Preview the current salary slip',
        description: 'Returns the latest borrower salary slip through the backend. The hosted ImgBB URL is not exposed to the browser.',
        operationId: 'getBorrowerSalarySlip',
        security: protectedRouteSecurity,
        responses: {
          200: {
            description: 'Salary slip bytes returned inline.',
            content: {
              'application/pdf': { schema: { type: 'string', format: 'binary' } },
              'image/jpeg': { schema: { type: 'string', format: 'binary' } },
              'image/png': { schema: { type: 'string', format: 'binary' } },
            },
          },
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: errorResponse('The salary slip is missing or unavailable.', {
            message: 'Salary slip preview is unavailable.',
            code: 'SALARY_SLIP_NOT_FOUND',
            errors: [],
          }),
        },
      },
    },
    '/ops/sales/leads': {
      get: {
        tags: ['Sales'],
        summary: 'List open borrower leads',
        description: 'Returns borrower accounts that do not have any loan application.',
        operationId: 'getSalesLeads',
        security: protectedRouteSecurity,
        parameters: paginationParameters,
        responses: {
          200: jsonResponse('Paginated open leads.', '#/components/schemas/LeadListResponse', {
            leads: [
              {
                id: userExample.id,
                email: userExample.email,
                fullName: userExample.fullName,
                profileCompleted: true,
                createdAt: loanExample.createdAt,
              },
            ],
            pagination: paginationExample,
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          422: errorResponse('Pagination parameters are invalid.', {
            message: 'Invalid pagination parameters.',
            code: 'INVALID_PAGINATION',
            errors: [],
          }),
        },
      },
    },
    '/ops/sanction/loans': {
      get: {
        tags: ['Sanction'],
        summary: 'List loans waiting for sanction review',
        operationId: 'getSanctionLoans',
        security: protectedRouteSecurity,
        parameters: paginationParameters,
        responses: {
          200: jsonResponse('Paginated APPLIED loans.', '#/components/schemas/LoanListResponse', {
            loans: [loanExample],
            pagination: paginationExample,
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          422: validationResponse,
        },
      },
    },
    '/ops/sanction/history': {
      get: {
        tags: ['Sanction'],
        summary: 'List sanction decision history',
        operationId: 'getSanctionHistory',
        security: protectedRouteSecurity,
        parameters: [
          ...paginationParameters,
          {
            name: 'status',
            in: 'query',
            required: false,
            description: 'Optional status filter.',
            schema: { type: 'string', enum: ['SANCTIONED', 'REJECTED', 'DISBURSED', 'CLOSED'] },
            example: 'REJECTED',
          },
        ],
        responses: {
          200: jsonResponse('Paginated sanction history.', '#/components/schemas/LoanListResponse', {
            loans: [{ ...loanExample, status: 'REJECTED', rejectionReason: 'Income policy not met.' }],
            pagination: paginationExample,
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          422: errorResponse('The status filter or pagination is invalid.', {
            message: 'Invalid status filter.',
            code: 'INVALID_STATUS_FILTER',
            errors: [],
          }),
        },
      },
    },
    '/ops/loans/{id}/sanction': {
      patch: {
        tags: ['Sanction'],
        summary: 'Approve or reject an applied loan',
        description: 'Only APPLIED loans can be sanctioned. A rejection reason is required when decision is reject.',
        operationId: 'sanctionLoan',
        security: protectedRouteSecurity,
        parameters: [{ $ref: '#/components/parameters/LoanId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SanctionDecisionRequest' },
              examples: {
                approve: { summary: 'Approve', value: { decision: 'approve' } },
                reject: { summary: 'Reject', value: { decision: 'reject', reason: 'Income policy not met.' } },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Loan decision recorded.', '#/components/schemas/LoanResponse', {
            loan: { ...loanExample, status: 'SANCTIONED', sanctionedAt: 1735776000000 },
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: errorResponse('The loan ID is not valid or does not exist.', {
            message: 'Loan not found.',
            code: 'LOAN_NOT_FOUND',
            errors: [],
          }),
          409: errorResponse('The loan is no longer APPLIED.', {
            message: 'Only applied loans can be sanctioned.',
            code: 'INVALID_LOAN_TRANSITION',
            errors: [],
          }),
          422: validationResponse,
        },
      },
    },
    '/ops/disbursement/loans': {
      get: {
        tags: ['Disbursement'],
        summary: 'List loans waiting for disbursement',
        operationId: 'getDisbursementLoans',
        security: protectedRouteSecurity,
        parameters: paginationParameters,
        responses: {
          200: jsonResponse('Paginated SANCTIONED loans.', '#/components/schemas/LoanListResponse', {
            loans: [{ ...loanExample, status: 'SANCTIONED', sanctionedAt: 1735776000000 }],
            pagination: paginationExample,
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          422: validationResponse,
        },
      },
    },
    '/ops/disbursement/history': {
      get: {
        tags: ['Disbursement'],
        summary: 'List disbursement history',
        operationId: 'getDisbursementHistory',
        security: protectedRouteSecurity,
        parameters: [
          ...paginationParameters,
          {
            name: 'status',
            in: 'query',
            required: false,
            description: 'Optional status filter.',
            schema: { type: 'string', enum: ['DISBURSED', 'CLOSED'] },
            example: 'DISBURSED',
          },
        ],
        responses: {
          200: jsonResponse('Paginated disbursement history.', '#/components/schemas/LoanListResponse', {
            loans: [{ ...loanExample, status: 'DISBURSED', sanctionedAt: 1735776000000, disbursedAt: 1735862400000 }],
            pagination: paginationExample,
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          422: validationResponse,
        },
      },
    },
    '/ops/loans/{id}/disburse': {
      patch: {
        tags: ['Disbursement'],
        summary: 'Mark a sanctioned loan as disbursed',
        description: 'Only SANCTIONED loans can be moved to DISBURSED.',
        operationId: 'disburseLoan',
        security: protectedRouteSecurity,
        parameters: [{ $ref: '#/components/parameters/LoanId' }],
        responses: {
          200: jsonResponse('Loan marked as disbursed.', '#/components/schemas/LoanResponse', {
            loan: { ...loanExample, status: 'DISBURSED', sanctionedAt: 1735776000000, disbursedAt: 1735862400000 },
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: errorResponse('The loan ID is not valid or does not exist.', {
            message: 'Loan not found.',
            code: 'LOAN_NOT_FOUND',
            errors: [],
          }),
          409: errorResponse('The loan is not SANCTIONED.', {
            message: 'Only sanctioned loans can be disbursed.',
            code: 'INVALID_LOAN_TRANSITION',
            errors: [],
          }),
        },
      },
    },
    '/ops/collection/loans': {
      get: {
        tags: ['Collection'],
        summary: 'List loans waiting for repayment',
        operationId: 'getCollectionLoans',
        security: protectedRouteSecurity,
        parameters: paginationParameters,
        responses: {
          200: jsonResponse('Paginated DISBURSED loans.', '#/components/schemas/LoanListResponse', {
            loans: [{ ...loanExample, status: 'DISBURSED', sanctionedAt: 1735776000000, disbursedAt: 1735862400000 }],
            pagination: paginationExample,
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          422: validationResponse,
        },
      },
    },
    '/ops/collection/history': {
      get: {
        tags: ['Collection'],
        summary: 'List payment history',
        operationId: 'getCollectionHistory',
        security: protectedRouteSecurity,
        parameters: [
          ...paginationParameters,
          {
            name: 'status',
            in: 'query',
            required: false,
            description: 'Optional status filter. Only loans with at least one payment are returned.',
            schema: { type: 'string', enum: ['DISBURSED', 'CLOSED'] },
            example: 'CLOSED',
          },
        ],
        responses: {
          200: jsonResponse('Paginated collection history with payments.', '#/components/schemas/CollectionHistoryResponse', {
            loans: [
              {
                ...loanExample,
                status: 'CLOSED',
                totalPaid: 154438.36,
                outstandingBalance: 0,
                closedAt: 1735948800000,
                isClosed: true,
                payments: [
                  {
                    id: '671234567890abcdef124000',
                    utr: 'DEMO-UTR-001',
                    amount: 154438.36,
                    paymentDate: 1735948800000,
                    createdAt: 1735948800000,
                  },
                ],
              },
            ],
            pagination: paginationExample,
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          422: validationResponse,
        },
      },
    },
    '/ops/loans/{id}/payments': {
      post: {
        tags: ['Collection'],
        summary: 'Record a payment',
        description:
          'Only DISBURSED loans accept payments. The UTR must be globally unique, and the amount cannot exceed the current outstanding balance. An exact final payment closes the loan.',
        operationId: 'recordPayment',
        security: protectedRouteSecurity,
        parameters: [{ $ref: '#/components/parameters/LoanId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentRequest' },
              example: { utr: 'DEMO-UTR-001', amount: 50000, paymentDate: 1735948800000 },
            },
          },
        },
        responses: {
          201: jsonResponse('Payment recorded and loan balance updated.', '#/components/schemas/LoanResponse', {
            loan: {
              ...loanExample,
              status: 'DISBURSED',
              totalPaid: 50000,
              outstandingBalance: 104438.36,
              sanctionedAt: 1735776000000,
              disbursedAt: 1735862400000,
            },
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: errorResponse('The loan ID is not valid or does not exist.', {
            message: 'Loan not found.',
            code: 'LOAN_NOT_FOUND',
            errors: [],
          }),
          409: errorResponse('The UTR is duplicated or the loan changed during recording.', {
            message: 'UTR number must be unique across all payments.',
            code: 'DUPLICATE_UTR',
            errors: [],
          }),
          422: errorResponse('The payment is invalid or exceeds the outstanding balance.', {
            message: 'Payment cannot exceed the outstanding balance of INR 104438.36.',
            code: 'OVERPAYMENT',
            errors: [],
          }),
        },
      },
    },
    '/ops/borrowers/{id}': {
      delete: {
        tags: ['Administration'],
        summary: 'Delete a borrower without loan history',
        description:
          'Admin-only cleanup operation. A borrower can be deleted only when no loan document exists for the account. Borrowers with any loan history are protected.',
        operationId: 'deleteBorrower',
        security: protectedRouteSecurity,
        parameters: [{ $ref: '#/components/parameters/BorrowerId' }],
        responses: {
          200: jsonResponse('Borrower account deleted.', '#/components/schemas/DeleteBorrowerResponse', {
            deleted: true,
            borrowerId: '671234567890abcdef123456',
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: errorResponse('The borrower ID is not valid or does not exist.', {
            message: 'Borrower not found.',
            code: 'BORROWER_NOT_FOUND',
            errors: [],
          }),
          409: errorResponse('The borrower has loan history or changed during deletion.', {
            message: 'Borrowers with loan history cannot be deleted.',
            code: 'BORROWER_HAS_LOAN_HISTORY',
            errors: [],
          }),
        },
      },
    },
    '/ops/loans/{id}': {
      get: {
        tags: ['Operations'],
        summary: 'Get an operations loan detail',
        description: 'Administrators can read any loan. Other operations roles can read only statuses belonging to their module.',
        operationId: 'getOperationsLoan',
        security: protectedRouteSecurity,
        parameters: [{ $ref: '#/components/parameters/LoanId' }],
        responses: {
          200: jsonResponse('Loan detail.', '#/components/schemas/LoanResponse', { loan: loanExample }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: errorResponse('The loan ID is not valid or does not exist.', {
            message: 'Loan not found.',
            code: 'LOAN_NOT_FOUND',
            errors: [],
          }),
        },
      },
      delete: {
        tags: ['Administration'],
        summary: 'Delete a non-financial loan application',
        description:
          'Admin-only cleanup operation. Only APPLIED or REJECTED applications with no payment history can be deleted. Disbursed and closed financial records cannot be deleted.',
        operationId: 'deleteLoanApplication',
        security: protectedRouteSecurity,
        parameters: [{ $ref: '#/components/parameters/LoanId' }],
        responses: {
          200: jsonResponse('Loan application deleted.', '#/components/schemas/DeleteLoanResponse', {
            deleted: true,
            loanId: '671234567890abcdef123999',
            status: 'REJECTED',
          }),
          401: unauthorizedResponse,
          403: forbiddenResponse,
          404: errorResponse('The loan ID is not valid or does not exist.', {
            message: 'Loan not found.',
            code: 'LOAN_NOT_FOUND',
            errors: [],
          }),
          409: errorResponse('The loan is financial, has payments, or changed during deletion.', {
            message: 'Only applied or rejected applications can be deleted.',
            code: 'LOAN_DELETE_NOT_ALLOWED',
            errors: [],
          }),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'creditsea_access_token',
        description:
          'Primary browser authentication. POST /auth/login or POST /auth/signup sets this HttpOnly cookie. The browser sends it automatically; JavaScript cannot read it.',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'API-client fallback accepted by the backend. Use the JWT returned only through a controlled API client; browser login uses the HttpOnly cookie instead.',
      },
    },
    parameters: {
      BorrowerId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'MongoDB ObjectId of the borrower.',
        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
        example: '671234567890abcdef123456',
      },
      LoanId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'MongoDB ObjectId of the loan.',
        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
        example: '671234567890abcdef123999',
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        required: ['status', 'service'],
        properties: {
          status: { type: 'string', example: 'ok' },
          service: { type: 'string', example: 'creditsea-lms-api' },
        },
      },
      ErrorDetail: {
        type: 'object',
        properties: {
          field: { type: 'string', example: 'pan' },
          message: { type: 'string', example: 'PAN must be 10 characters: 5 letters, 4 digits, then 1 letter.' },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['message', 'code', 'errors'],
        properties: {
          message: { type: 'string', example: 'Validation failed.' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          errors: {
            type: 'array',
            items: {
              oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/ErrorDetail' }],
            },
            example: [{ field: 'pan', message: 'PAN must be 10 characters: 5 letters, 4 digits, then 1 letter.' }],
          },
        },
      },
      AuthCredentials: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 160, example: 'borrower@example.com' },
          password: { type: 'string', format: 'password', minLength: 8, maxLength: 72, example: 'Password123!' },
        },
      },
      User: {
        type: 'object',
        required: ['id', 'email', 'role', 'fullName', 'pan', 'dateOfBirth', 'monthlySalary', 'employmentMode', 'profileCompleted'],
        properties: {
          id: { type: 'string', example: userExample.id },
          email: { type: 'string', format: 'email', example: userExample.email },
          role: { type: 'string', enum: ['ADMIN', 'SALES', 'SANCTION', 'DISBURSEMENT', 'COLLECTION', 'BORROWER'], example: 'BORROWER' },
          fullName: { type: 'string', nullable: true, example: userExample.fullName },
          pan: { type: 'string', nullable: true, pattern: '^[A-Z]{5}[0-9]{4}[A-Z]$', example: userExample.pan },
          dateOfBirth: {
            type: 'integer',
            format: 'int64',
            nullable: true,
            description: 'Unix epoch milliseconds.',
            example: userExample.dateOfBirth,
          },
          monthlySalary: { type: 'number', nullable: true, example: userExample.monthlySalary },
          employmentMode: { type: 'string', nullable: true, enum: ['SALARIED', 'SELF_EMPLOYED', 'UNEMPLOYED'], example: 'SALARIED' },
          profileCompleted: { type: 'boolean', example: true },
        },
      },
      AuthResponse: {
        type: 'object',
        required: ['user'],
        properties: { user: { $ref: '#/components/schemas/User' } },
      },
      EligibilityResult: {
        type: 'object',
        required: ['eligible', 'errors'],
        properties: {
          eligible: { type: 'boolean', example: true },
          errors: { type: 'array', items: { type: 'string' }, example: [] },
        },
      },
      ProfileUpdateRequest: {
        type: 'object',
        required: ['fullName', 'pan', 'dateOfBirth', 'monthlySalary', 'employmentMode'],
        properties: {
          fullName: { type: 'string', minLength: 2, maxLength: 100, example: 'Aarav Sharma' },
          pan: { type: 'string', pattern: '^[A-Z]{5}[0-9]{4}[A-Z]$', maxLength: 10, example: 'ABCDE1234F' },
          dateOfBirth: { type: 'integer', format: 'int64', description: 'Unix epoch milliseconds.', example: 695433600000 },
          monthlySalary: { type: 'number', minimum: 0, example: 65000 },
          employmentMode: { type: 'string', enum: ['SALARIED', 'SELF_EMPLOYED', 'UNEMPLOYED'], example: 'SALARIED' },
        },
      },
      ProfileResponse: {
        type: 'object',
        required: ['profile', 'eligibility'],
        properties: {
          profile: { $ref: '#/components/schemas/User' },
          eligibility: { $ref: '#/components/schemas/EligibilityResult' },
        },
      },
      LoanApplicationRequest: {
        type: 'object',
        required: ['salarySlip', 'amount', 'tenureDays'],
        properties: {
          salarySlip: { type: 'string', format: 'binary', description: 'PDF, JPG, or PNG salary slip. Maximum 5 MB.' },
          amount: { type: 'integer', minimum: 50000, maximum: 500000, example: 150000 },
          tenureDays: { type: 'integer', minimum: 30, maximum: 365, example: 90 },
        },
      },
      SalarySlip: {
        type: 'object',
        required: ['originalName', 'mimeType', 'sizeBytes'],
        properties: {
          originalName: { type: 'string', example: 'salary-slip-january.pdf' },
          mimeType: { type: 'string', enum: ['application/pdf', 'image/jpeg', 'image/png'], example: 'application/pdf' },
          sizeBytes: { type: 'integer', minimum: 1, example: 245760 },
        },
      },
      BorrowerSummary: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string', example: userExample.id },
          email: { type: 'string', nullable: true, example: userExample.email },
          fullName: { type: 'string', nullable: true, example: userExample.fullName },
          pan: { type: 'string', nullable: true, example: userExample.pan },
        },
      },
      Loan: {
        type: 'object',
        required: [
          'id',
          'borrowerId',
          'amount',
          'tenureDays',
          'interestRate',
          'simpleInterest',
          'totalRepayment',
          'totalPaid',
          'outstandingBalance',
          'status',
          'rejectionReason',
          'salarySlip',
          'sanctionedAt',
          'disbursedAt',
          'closedAt',
          'createdAt',
          'updatedAt',
          'isClosed',
        ],
        properties: {
          id: { type: 'string', example: loanExample.id },
          borrowerId: { type: 'string', nullable: true, example: loanExample.borrowerId },
          borrower: { $ref: '#/components/schemas/BorrowerSummary' },
          amount: { type: 'number', minimum: 50000, maximum: 500000, example: 150000 },
          tenureDays: { type: 'integer', minimum: 30, maximum: 365, example: 90 },
          interestRate: { type: 'number', example: 12 },
          simpleInterest: { type: 'number', example: 4438.36 },
          totalRepayment: { type: 'number', example: 154438.36 },
          totalPaid: { type: 'number', example: 0 },
          outstandingBalance: { type: 'number', example: 154438.36 },
          status: { type: 'string', enum: ['APPLIED', 'SANCTIONED', 'REJECTED', 'DISBURSED', 'CLOSED'], example: 'APPLIED' },
          rejectionReason: { type: 'string', nullable: true, example: null },
          salarySlip: { $ref: '#/components/schemas/SalarySlip' },
          sanctionedAt: { type: 'integer', format: 'int64', nullable: true, example: null },
          disbursedAt: { type: 'integer', format: 'int64', nullable: true, example: null },
          closedAt: { type: 'integer', format: 'int64', nullable: true, example: null },
          createdAt: { type: 'integer', format: 'int64', description: 'Unix epoch milliseconds.', example: 1735689600000 },
          updatedAt: { type: 'integer', format: 'int64', description: 'Unix epoch milliseconds.', example: 1735689600000 },
          isClosed: { type: 'boolean', example: false },
        },
      },
      LoanResponse: {
        type: 'object',
        required: ['loan'],
        properties: { loan: { $ref: '#/components/schemas/Loan' } },
      },
      PaginationMeta: {
        type: 'object',
        required: ['page', 'pageSize', 'total', 'totalPages', 'hasNextPage', 'hasPreviousPage'],
        properties: {
          page: { type: 'integer', example: 1 },
          pageSize: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 1 },
          totalPages: { type: 'integer', example: 1 },
          hasNextPage: { type: 'boolean', example: false },
          hasPreviousPage: { type: 'boolean', example: false },
        },
      },
      LoanListResponse: {
        type: 'object',
        required: ['loans', 'pagination'],
        properties: {
          loans: { type: 'array', items: { $ref: '#/components/schemas/Loan' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
      },
      Lead: {
        type: 'object',
        required: ['id', 'email', 'fullName', 'profileCompleted', 'createdAt'],
        properties: {
          id: { type: 'string', example: userExample.id },
          email: { type: 'string', format: 'email', example: userExample.email },
          fullName: { type: 'string', nullable: true, example: userExample.fullName },
          profileCompleted: { type: 'boolean', example: true },
          createdAt: { type: 'integer', format: 'int64', example: 1735689600000 },
        },
      },
      LeadListResponse: {
        type: 'object',
        required: ['leads', 'pagination'],
        properties: {
          leads: { type: 'array', items: { $ref: '#/components/schemas/Lead' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
      },
      SanctionDecisionRequest: {
        type: 'object',
        required: ['decision'],
        properties: {
          decision: { type: 'string', enum: ['approve', 'reject'], example: 'approve' },
          reason: { type: 'string', maxLength: 500, description: 'Required when decision is reject.', example: 'Income policy not met.' },
        },
      },
      PaymentRequest: {
        type: 'object',
        required: ['utr', 'amount', 'paymentDate'],
        properties: {
          utr: { type: 'string', pattern: '^(?=.{6,30}$)[A-Z0-9]+(?:-[A-Z0-9]+)*$', minLength: 6, maxLength: 30, example: 'DEMO-UTR-001' },
          amount: { type: 'number', exclusiveMinimum: 0, example: 50000 },
          paymentDate: { type: 'integer', format: 'int64', description: 'Unix epoch milliseconds.', example: 1735948800000 },
        },
      },
      CollectionPayment: {
        type: 'object',
        required: ['id', 'utr', 'amount', 'paymentDate', 'createdAt'],
        properties: {
          id: { type: 'string', example: '671234567890abcdef124000' },
          utr: { type: 'string', example: 'DEMO-UTR-001' },
          amount: { type: 'number', example: 50000 },
          paymentDate: { type: 'integer', format: 'int64', example: 1735948800000 },
          createdAt: { type: 'integer', format: 'int64', example: 1735948800000 },
        },
      },
      CollectionHistoryLoan: {
        allOf: [
          { $ref: '#/components/schemas/Loan' },
          {
            type: 'object',
            required: ['payments'],
            properties: {
              payments: { type: 'array', items: { $ref: '#/components/schemas/CollectionPayment' } },
            },
          },
        ],
      },
      CollectionHistoryResponse: {
        type: 'object',
        required: ['loans', 'pagination'],
        properties: {
          loans: { type: 'array', items: { $ref: '#/components/schemas/CollectionHistoryLoan' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
      },
      DeleteBorrowerResponse: {
        type: 'object',
        required: ['deleted', 'borrowerId'],
        properties: {
          deleted: { type: 'boolean', example: true },
          borrowerId: { type: 'string', example: userExample.id },
        },
      },
      DeleteLoanResponse: {
        type: 'object',
        required: ['deleted', 'loanId', 'status'],
        properties: {
          deleted: { type: 'boolean', example: true },
          loanId: { type: 'string', example: loanExample.id },
          status: { type: 'string', enum: ['APPLIED', 'REJECTED'], example: 'REJECTED' },
        },
      },
    },
  },
} as const;
