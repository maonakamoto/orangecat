import { logger } from './logger';

// Performance monitoring
const trackPerformance = (metricName: string, value: number) => {
  if (process.env.NODE_ENV === 'production') {
    logger.performance(metricName, value);
  }
};

// Error tracking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const trackError = (error: Error, context?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    // Log to Vercel Error Tracking
    logger.error('Application error', {
      message: error.message,
      stack: error.stack,
      context,
    });
  }
};

// Page view tracking
const trackPageView = (path: string) => {
  if (process.env.NODE_ENV === 'production') {
    logger.info(`Page View: ${path}`, undefined, 'Analytics');
  }
};

// Custom event tracking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    logger.info(`Event: ${eventName}`, properties, 'Analytics');
  }
};
