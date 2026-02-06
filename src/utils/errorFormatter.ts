export function formatError(error: any): string {
  if (!error) return 'An unexpected error occurred';

  if (typeof error === 'string') return error;

  if (error.code) {
    switch (error.code) {
      case '23505':
        return 'This record already exists. Please check your data and try again.';
      case '23503':
        return 'Cannot delete: This record is being used elsewhere in the system.';
      case '23502':
        return 'Required field is missing. Please fill in all required fields.';
      case '42P01':
        return 'Database table not found. Please contact support.';
      case 'PGRST116':
        return 'No records found matching your criteria.';
      case '22P02':
        return 'Invalid data format. Please check your input.';
      default:
        if (error.code.startsWith('23')) {
          return 'Database constraint violation. Please check your input.';
        }
    }
  }

  if (error.message) {
    const message = error.message.toLowerCase();

    if (message.includes('invalid login') || message.includes('invalid credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }

    if (message.includes('user already registered')) {
      return 'An account with this email already exists. Try logging in instead.';
    }

    if (message.includes('email not confirmed')) {
      return 'Please verify your email address before logging in.';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your internet connection and try again.';
    }

    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    if (message.includes('jwt') || message.includes('token')) {
      return 'Your session has expired. Please log in again.';
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'You do not have permission to perform this action.';
    }

    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

export function getErrorType(error: any): 'auth' | 'network' | 'validation' | 'database' | 'unknown' {
  if (!error) return 'unknown';

  const message = error.message?.toLowerCase() || '';

  if (
    message.includes('login') ||
    message.includes('auth') ||
    message.includes('token') ||
    message.includes('jwt')
  ) {
    return 'auth';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return 'network';
  }

  if (error.code?.startsWith('23')) {
    return 'database';
  }

  if (message.includes('required') || message.includes('invalid')) {
    return 'validation';
  }

  return 'unknown';
}
