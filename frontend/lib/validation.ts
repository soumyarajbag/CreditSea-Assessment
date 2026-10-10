export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const UTR_REGEX = /^(?=.{6,30}$)[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export const PAN_FORMAT_HELP = 'Use 10 characters: 5 uppercase letters, 4 digits, then 1 uppercase letter. Example: ABCDE1234F.';
export const UTR_FORMAT_HELP = 'Use 6–30 characters with letters or digits. Hyphens are allowed between groups. Example: DEMO-UTR-001.';
