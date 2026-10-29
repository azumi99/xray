describe('Login Screen (Simple)', () => {
  const TEST_IDS = {
    EMAIL_INPUT: 'email_input',
    PASSWORD_INPUT: 'password_input',
    LOGIN_BUTTON: 'login_button',
    SHOW_PASSWORD_BUTTON: 'show_password_button',
  };

  beforeAll(async () => {
    await device.launchApp();
  });

  it('should display login screen elements', async () => {
    await expect(element(by.id(TEST_IDS.EMAIL_INPUT))).toBeVisible();
    await expect(element(by.id(TEST_IDS.PASSWORD_INPUT))).toBeVisible();
    await expect(element(by.id(TEST_IDS.LOGIN_BUTTON))).toBeVisible();
    await expect(element(by.text('Welcome Back'))).toBeVisible();
    await expect(element(by.text('Sign in to your account to continue'))).toBeVisible();
  });

  it('should allow typing in email field', async () => {
    const testEmail = 'test@example.com';
    await element(by.id(TEST_IDS.EMAIL_INPUT)).typeText(testEmail);
    await expect(element(by.id(TEST_IDS.EMAIL_INPUT))).toHaveText(testEmail);
  });

  it('should allow typing in password field', async () => {
    const testPassword = 'password123';
    await element(by.id(TEST_IDS.PASSWORD_INPUT)).typeText(testPassword);
  });

  it('should have a login button', async () => {
    await expect(element(by.id(TEST_IDS.LOGIN_BUTTON))).toBeVisible();
    const loginButtonText = await element(by.text('Sign In'));
    await expect(loginButtonText).toBeVisible();
  });

  it('should have show password button', async () => {
    await expect(element(by.id(TEST_IDS.SHOW_PASSWORD_BUTTON))).toBeVisible();
  });

  it('should show forgot password link', async () => {
    await expect(element(by.text('Forgot password?'))).toBeVisible();
  });

  it('should show sign up link', async () => {
    await expect(element(by.text("Don't have an account?"))).toBeVisible();
    await expect(element(by.text('Sign Up'))).toBeVisible();
  });
});
