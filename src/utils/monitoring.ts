import { logger } from './logger';

// Custom event tracking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    logger.info(`Event: ${eventName}`, properties, 'Analytics');
  }
};
