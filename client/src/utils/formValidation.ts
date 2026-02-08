export const validators = {
  required: (value: any, fieldName = 'This field'): string | null => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return `${fieldName} is required`;
    }
    return null;
  },

  email: (value: string): string | null => {
    if (!value) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  password: (value: string): string | null => {
    if (!value) return 'Password is required';
    if (value.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(value)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(value)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(value)) {
      return 'Password must contain at least one number';
    }
    return null;
  },

  passwordSimple: (value: string): string | null => {
    if (!value) return 'Password is required';
    if (value.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return null;
  },

  minLength: (value: string, min: number, fieldName = 'This field'): string | null => {
    if (!value) return `${fieldName} is required`;
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (value: string, max: number, fieldName = 'This field'): string | null => {
    if (value && value.length > max) {
      return `${fieldName} must be no more than ${max} characters`;
    }
    return null;
  },

  numeric: (value: any, fieldName = 'This field'): string | null => {
    if (value === '' || value === null || value === undefined) {
      return `${fieldName} is required`;
    }
    if (isNaN(Number(value))) {
      return `${fieldName} must be a number`;
    }
    return null;
  },

  positiveNumber: (value: any, fieldName = 'This field'): string | null => {
    const numError = validators.numeric(value, fieldName);
    if (numError) return numError;
    if (Number(value) <= 0) {
      return `${fieldName} must be greater than 0`;
    }
    return null;
  },

  minValue: (value: any, min: number, fieldName = 'This field'): string | null => {
    const numError = validators.numeric(value, fieldName);
    if (numError) return numError;
    if (Number(value) < min) {
      return `${fieldName} must be at least ${min}`;
    }
    return null;
  },

  maxValue: (value: any, max: number, fieldName = 'This field'): string | null => {
    const numError = validators.numeric(value, fieldName);
    if (numError) return numError;
    if (Number(value) > max) {
      return `${fieldName} must be no more than ${max}`;
    }
    return null;
  },

  url: (value: string): string | null => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  phone: (value: string): string | null => {
    if (!value) return null;
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(value)) {
      return 'Please enter a valid phone number';
    }
    if (value.replace(/\D/g, '').length < 10) {
      return 'Phone number must have at least 10 digits';
    }
    return null;
  },

  date: (value: string, fieldName = 'Date'): string | null => {
    if (!value) return `${fieldName} is required`;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Please enter a valid date';
    }
    return null;
  },

  dateRange: (startDate: string, endDate: string): string | null => {
    if (!startDate || !endDate) return 'Both dates are required';
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return 'End date must be after start date';
    }
    return null;
  },

  match: (value: string, matchValue: string, fieldName = 'Field'): string | null => {
    if (value !== matchValue) {
      return `${fieldName} does not match`;
    }
    return null;
  },
};

export function validateForm<T extends Record<string, any>>(
  data: T,
  rules: Partial<Record<keyof T, (value: any) => string | null>>
): { isValid: boolean; errors: Partial<Record<keyof T, string>> } {
  const errors: Partial<Record<keyof T, string>> = {};

  for (const field in rules) {
    const validator = rules[field];
    if (validator) {
      const error = validator(data[field]);
      if (error) {
        errors[field] = error;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: 'None', color: 'gray' };

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score, label: 'Weak', color: 'red' };
  if (score <= 4) return { score, label: 'Fair', color: 'yellow' };
  if (score <= 5) return { score, label: 'Good', color: 'blue' };
  return { score, label: 'Strong', color: 'green' };
}
