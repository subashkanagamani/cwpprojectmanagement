export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validators = {
  email: (value: string): ValidationResult => {
    if (!value) {
      return { isValid: false, error: 'Email is required' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { isValid: false, error: 'Invalid email format' };
    }
    return { isValid: true };
  },

  phone: (value: string): ValidationResult => {
    if (!value) return { isValid: true };
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 10) {
      return { isValid: false, error: 'Invalid phone number (min 10 digits)' };
    }
    return { isValid: true };
  },

  url: (value: string): ValidationResult => {
    if (!value) return { isValid: true };
    try {
      new URL(value);
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Invalid URL format' };
    }
  },

  required: (value: string | number | null | undefined): ValidationResult => {
    if (value === null || value === undefined || value === '') {
      return { isValid: false, error: 'This field is required' };
    }
    return { isValid: true };
  },

  minLength: (min: number) => (value: string): ValidationResult => {
    if (value.length < min) {
      return { isValid: false, error: `Minimum ${min} characters required` };
    }
    return { isValid: true };
  },

  maxLength: (max: number) => (value: string): ValidationResult => {
    if (value.length > max) {
      return { isValid: false, error: `Maximum ${max} characters allowed` };
    }
    return { isValid: true };
  },

  number: (value: string): ValidationResult => {
    if (!value) return { isValid: true };
    if (isNaN(Number(value))) {
      return { isValid: false, error: 'Must be a valid number' };
    }
    return { isValid: true };
  },

  positiveNumber: (value: string | number): ValidationResult => {
    const num = typeof value === 'string' ? Number(value) : value;
    if (isNaN(num) || num < 0) {
      return { isValid: false, error: 'Must be a positive number' };
    }
    return { isValid: true };
  },

  dateRange: (startDate: string, endDate: string): ValidationResult => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return { isValid: false, error: 'End date must be after start date' };
    }
    return { isValid: true };
  },

  futureDate: (date: string): ValidationResult => {
    if (date && new Date(date) > new Date()) {
      return { isValid: false, error: 'Date cannot be in the future' };
    }
    return { isValid: true };
  },

  password: (value: string): ValidationResult => {
    if (!value) {
      return { isValid: false, error: 'Password is required' };
    }
    if (value.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(value)) {
      return { isValid: false, error: 'Password must contain an uppercase letter' };
    }
    if (!/[a-z]/.test(value)) {
      return { isValid: false, error: 'Password must contain a lowercase letter' };
    }
    if (!/[0-9]/.test(value)) {
      return { isValid: false, error: 'Password must contain a number' };
    }
    return { isValid: true };
  },

  minValue: (min: number) => (value: string | number): ValidationResult => {
    const num = typeof value === 'string' ? Number(value) : value;
    if (isNaN(num) || num < min) {
      return { isValid: false, error: `Value must be at least ${min}` };
    }
    return { isValid: true };
  },

  maxValue: (max: number) => (value: string | number): ValidationResult => {
    const num = typeof value === 'string' ? Number(value) : value;
    if (isNaN(num) || num > max) {
      return { isValid: false, error: `Value must not exceed ${max}` };
    }
    return { isValid: true };
  },

  range: (min: number, max: number) => (value: string | number): ValidationResult => {
    const num = typeof value === 'string' ? Number(value) : value;
    if (isNaN(num) || num < min || num > max) {
      return { isValid: false, error: `Value must be between ${min} and ${max}` };
    }
    return { isValid: true };
  },

  percentage: (value: string | number): ValidationResult => {
    const num = typeof value === 'string' ? Number(value) : value;
    if (isNaN(num) || num < 0 || num > 100) {
      return { isValid: false, error: 'Must be a percentage between 0 and 100' };
    }
    return { isValid: true };
  },

  decimal: (places: number) => (value: string | number): ValidationResult => {
    const num = typeof value === 'string' ? Number(value) : value;
    if (isNaN(num)) {
      return { isValid: false, error: 'Must be a valid number' };
    }
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    if (decimalPlaces > places) {
      return { isValid: false, error: `Maximum ${places} decimal places allowed` };
    }
    return { isValid: true };
  },

  currency: (value: string | number): ValidationResult => {
    const num = typeof value === 'string' ? Number(value.replace(/[^0-9.-]/g, '')) : value;
    if (isNaN(num) || num < 0) {
      return { isValid: false, error: 'Must be a valid currency amount' };
    }
    const decimalPlaces = (num.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      return { isValid: false, error: 'Currency can have maximum 2 decimal places' };
    }
    return { isValid: true };
  },

  alphanumeric: (value: string): ValidationResult => {
    if (!value) return { isValid: true };
    if (!/^[a-zA-Z0-9]+$/.test(value)) {
      return { isValid: false, error: 'Only letters and numbers are allowed' };
    }
    return { isValid: true };
  },

  match: (otherValue: string, fieldName: string) => (value: string): ValidationResult => {
    if (value !== otherValue) {
      return { isValid: false, error: `Must match ${fieldName}` };
    }
    return { isValid: true };
  },

  fileSize: (maxSizeInMB: number) => (file: File | null): ValidationResult => {
    if (!file) return { isValid: true };
    const maxBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return { isValid: false, error: `File size must be less than ${maxSizeInMB}MB` };
    }
    return { isValid: true };
  },

  fileType: (allowedTypes: string[]) => (file: File | null): ValidationResult => {
    if (!file) return { isValid: true };
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !allowedTypes.includes(fileExt)) {
      return { isValid: false, error: `Allowed file types: ${allowedTypes.join(', ')}` };
    }
    return { isValid: true };
  },

  uniqueInArray: (array: any[], key: string) => (value: any): ValidationResult => {
    const exists = array.some(item => item[key] === value);
    if (exists) {
      return { isValid: false, error: 'This value already exists' };
    }
    return { isValid: true };
  },
};

export function validateField(
  value: any,
  validations: Array<(value: any) => ValidationResult>
): ValidationResult {
  for (const validate of validations) {
    const result = validate(value);
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true };
}

export function validateForm(
  data: Record<string, any>,
  rules: Record<string, Array<(value: any) => ValidationResult>>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const [field, validations] of Object.entries(rules)) {
    const result = validateField(data[field], validations);
    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
