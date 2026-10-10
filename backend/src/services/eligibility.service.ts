import { EmploymentMode, PAN_REGEX } from '../constants';

interface EligibilityInput {
  dateOfBirth?: Date | number | string;
  monthlySalary?: number;
  pan?: string;
  employmentMode?: EmploymentMode | string;
}

export const calculateAge = (dateOfBirth: Date, today = new Date()): number => {
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = today.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dateOfBirth.getDate())) age -= 1;
  return age;
};

export const evaluateEligibility = (input: EligibilityInput) => {
  const errors: string[] = [];
  const dateOfBirth = input.dateOfBirth !== undefined && input.dateOfBirth !== null ? new Date(input.dateOfBirth) : null;
  const isValidDate = dateOfBirth && !Number.isNaN(dateOfBirth.getTime());

  if (!isValidDate) {
    errors.push('Date of birth must be a valid date.');
  } else {
    const age = calculateAge(dateOfBirth);
    if (age < 23 || age > 50) errors.push('Applicant age must be between 23 and 50 years.');
    if (dateOfBirth > new Date()) errors.push('Date of birth cannot be in the future.');
  }

  if (typeof input.monthlySalary !== 'number' || input.monthlySalary < 25000) {
    errors.push('Monthly salary must be at least ₹25,000.');
  }

  const normalizedPan = input.pan?.trim().toUpperCase() ?? '';
  if (!PAN_REGEX.test(normalizedPan)) {
    errors.push('PAN must match the valid format, for example ABCDE1234F.');
  }

  if (input.employmentMode === EmploymentMode.UNEMPLOYED) {
    errors.push('Unemployed applicants are not eligible.');
  } else if (!input.employmentMode) {
    errors.push('Employment mode is required.');
  }

  return { eligible: errors.length === 0, errors };
};
