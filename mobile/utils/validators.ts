export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // At least 6 characters
  return password.length >= 6;
};

export const validateAwbNumber = (awbNumber: string): boolean => {
  // Basic AWB number validation (11 digits)
  const awbRegex = /^\d{3}-\d{8}$/;
  return awbRegex.test(awbNumber) || awbNumber.length > 0; // Allow any format for now
};