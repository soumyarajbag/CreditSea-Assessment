export const INTEREST_RATE = 12;
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const AUTH_COOKIE_NAME = 'creditsea_access_token';
export const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const UTR_REGEX = /^(?=.{6,30}$)[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export const ALLOWED_SALARY_SLIP_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export enum Role {
  ADMIN = 'ADMIN',
  SALES = 'SALES',
  SANCTION = 'SANCTION',
  DISBURSEMENT = 'DISBURSEMENT',
  COLLECTION = 'COLLECTION',
  BORROWER = 'BORROWER',
}

export enum EmploymentMode {
  SALARIED = 'SALARIED',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  UNEMPLOYED = 'UNEMPLOYED',
}

export enum LoanStatus {
  APPLIED = 'APPLIED',
  SANCTIONED = 'SANCTIONED',
  REJECTED = 'REJECTED',
  DISBURSED = 'DISBURSED',
  CLOSED = 'CLOSED',
}
