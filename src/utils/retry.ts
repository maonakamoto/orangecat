/**
 * Utility functions for implementing retry logic with exponential backoff
 */

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryCondition?: (error: unknown) => boolean;
}

/**
 * Default retry condition - retries on network errors and 5xx status codes
 */
type ErrorLike = {
  name?: string;
  message?: string;
  response?: { status?: number };
  status?: number;
  code?: string;
};

function isRetryableError(error: unknown): boolean {
  if (!error) {
    return false;
  }
  const e = error as ErrorLike;
  if (e.name === 'NetworkError' || e.message?.includes('network') || e.message?.includes('fetch')) {
    return true;
  }

  const status = e.response?.status ?? e.status;
  if (typeof status === 'number') {
    if (status >= 500 || status === 429) {
      return true;
    }
    if (status >= 400 && status < 500 && status !== 429) {
      return false;
    }
  }

  if (e.name === 'TimeoutError' || e.code === 'ETIMEDOUT') {
    return true;
  }

  return true;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const { baseDelay = 1000, maxDelay = 30000, backoffFactor = 2, jitter = true } = options;

  const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);

  if (jitter) {
    // Add random jitter up to 25% of the delay
    const jitterAmount = delay * 0.25 * Math.random();
    return delay + jitterAmount;
  }

  return delay;
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, retryCondition = isRetryableError } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If this is the last attempt, don't retry
      if (attempt === maxAttempts) {
        break;
      }

      // Check if we should retry this error
      if (!retryCondition(error)) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, options);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry specifically for API calls with better error classification
 */
export async function withApiRetry<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'retryCondition'> = {}
): Promise<T> {
  return withRetry(fn, {
    ...options,
    retryCondition: error => {
      // More sophisticated error classification for API calls
      if (!error) {
        return false;
      }
      const e = error as ErrorLike;

      // HTTP status codes
      const status = e.response?.status || e.status;
      if (typeof status === 'number') {
        // Retry on server errors, rate limiting, and network issues
        if (status >= 500 || status === 429 || status === 0) {
          return true;
        }
        // Don't retry on authentication/authorization errors
        if (status === 401 || status === 403) {
          return false;
        }
        // Don't retry on client errors (except rate limiting)
        if (status >= 400 && status < 500 && status !== 429) {
          return false;
        }
      }

      // Network errors
      if (e.name === 'NetworkError' || e.code === 'NETWORK_ERROR') {
        return true;
      }

      // Timeout errors
      if (e.name === 'TimeoutError' || e.code === 'ETIMEDOUT') {
        return true;
      }

      // Fetch errors
      if (e.message?.includes('fetch')) {
        return true;
      }

      return false;
    },
  });
}
