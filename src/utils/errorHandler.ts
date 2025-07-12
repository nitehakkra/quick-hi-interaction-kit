// Global error handling utilities

export const logError = (error: Error | string, context?: string) => {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : '';
  
  console.error(`[${timestamp}] ${context ? `${context}: ` : ''}${errorMessage}`, {
    stack,
    timestamp,
    context,
    userAgent: navigator.userAgent,
    url: window.location.href
  });
};

export const handleAsyncError = (promise: Promise<any>, context?: string) => {
  return promise.catch((error) => {
    logError(error, context);
    throw error;
  });
};

export const safeAsync = async <T>(
  asyncFn: () => Promise<T>,
  fallback: T,
  context?: string
): Promise<T> => {
  try {
    return await asyncFn();
  } catch (error) {
    logError(error as Error, context);
    return fallback;
  }
};

export const validateRequired = (value: any, fieldName: string): boolean => {
  if (value === null || value === undefined || value === '') {
    logError(`Required field missing: ${fieldName}`, 'Validation');
    return false;
  }
  return true;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    logError(`Invalid email format: ${email}`, 'Validation');
    return false;
  }
  return true;
};

export const validateCardNumber = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (!/^\d{16}$/.test(cleaned)) {
    logError('Invalid card number format', 'Validation');
    return false;
  }
  return true;
};

export const handleSocketError = (error: any, context?: string) => {
  logError(error, `WebSocket ${context || 'Error'}`);
  
  // You could implement retry logic here
  // or show user-friendly error messages
};