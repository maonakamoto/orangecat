/** @jest-environment jsdom */
import { queueUpdated } from '@/lib/offline-queue-events';

describe('offline-queue-events', () => {
  test('dispatches updated event (including legacy back-compat)', () => {
    const updatedSpy = jest.fn();
    const legacySpy = jest.fn();
    window.addEventListener('offline-queue:updated', updatedSpy as EventListener);
    window.addEventListener('offline-queue-updated', legacySpy as EventListener);

    queueUpdated();

    expect(updatedSpy).toHaveBeenCalled();
    expect(legacySpy).toHaveBeenCalled();

    window.removeEventListener('offline-queue:updated', updatedSpy as EventListener);
    window.removeEventListener('offline-queue-updated', legacySpy as EventListener);
  });
});
