/**
 * E2E credential SSOT.
 *
 * CI and workflow matrix use E2E_USER_EMAIL / E2E_USER_PASSWORD.
 * Legacy specs used E2E_TEST_USER_* — both are accepted for compatibility.
 */

export interface E2ECredentials {
  email: string;
  password: string;
}

export function getE2ECredentials(): Partial<E2ECredentials> {
  return {
    email: process.env.E2E_USER_EMAIL || process.env.E2E_TEST_USER_EMAIL,
    password: process.env.E2E_USER_PASSWORD || process.env.E2E_TEST_USER_PASSWORD,
  };
}

export function requireE2ECredentials(): E2ECredentials {
  const { email, password } = getE2ECredentials();
  if (!email || !password) {
    throw new Error(
      'Missing E2E_USER_EMAIL/E2E_USER_PASSWORD (or legacy E2E_TEST_USER_*) in environment'
    );
  }
  return { email, password };
}

export function hasE2ECredentials(): boolean {
  const { email, password } = getE2ECredentials();
  return Boolean(email && password);
}
