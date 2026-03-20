import { describe, expect, it, vi } from 'vitest';
import { createReloadController } from '../lib/reload-controller.js';

describe('createReloadController', () => {
  it('marks refreshing immediately, signals core, then schedules a delayed refresh', async () => {
    const signalCore = vi.fn().mockResolvedValue(undefined);
    const scheduleDelay = vi.fn((seconds, callback) => {
      callback();
      return 123;
    });
    const cancelDelay = vi.fn();
    const refreshNow = vi.fn();
    const onRefreshingChange = vi.fn();

    const controller = createReloadController({
      signalCore,
      scheduleDelay,
      cancelDelay,
      refreshNow,
      onRefreshingChange,
    });

    await controller.trigger();

    expect(onRefreshingChange).toHaveBeenNthCalledWith(1, true);
    expect(signalCore).toHaveBeenCalledTimes(1);
    expect(scheduleDelay).toHaveBeenCalledWith(3, expect.any(Function));
    expect(refreshNow).toHaveBeenCalledTimes(1);
    expect(onRefreshingChange).toHaveBeenLastCalledWith(false);
  });

  it('clears refreshing and refreshes immediately when signaling the core fails', async () => {
    const signalCore = vi.fn().mockRejectedValue(new Error('systemctl failed'));
    const scheduleDelay = vi.fn();
    const cancelDelay = vi.fn();
    const refreshNow = vi.fn();
    const onRefreshingChange = vi.fn();
    const logError = vi.fn();

    const controller = createReloadController({
      signalCore,
      scheduleDelay,
      cancelDelay,
      refreshNow,
      onRefreshingChange,
      logError,
    });

    await controller.trigger();

    expect(scheduleDelay).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledTimes(1);
    expect(refreshNow).toHaveBeenCalledTimes(1);
    expect(onRefreshingChange).toHaveBeenNthCalledWith(1, true);
    expect(onRefreshingChange).toHaveBeenNthCalledWith(2, false);
  });

  it('ignores duplicate trigger calls while a refresh is already in progress', async () => {
    let scheduledCallback;
    const signalCore = vi.fn().mockResolvedValue(undefined);
    const controller = createReloadController({
      signalCore,
      scheduleDelay: vi.fn((seconds, callback) => {
        scheduledCallback = callback;
        return 456;
      }),
      cancelDelay: vi.fn(),
      refreshNow: vi.fn(),
      onRefreshingChange: vi.fn(),
    });

    await controller.trigger();
    await controller.trigger();

    expect(signalCore).toHaveBeenCalledTimes(1);
    expect(controller.isRefreshing()).toBe(true);
    scheduledCallback();
    expect(controller.isRefreshing()).toBe(false);
  });

  it('cancels a pending timeout during dispose', async () => {
    const cancelDelay = vi.fn();
    const controller = createReloadController({
      signalCore: vi.fn().mockResolvedValue(undefined),
      scheduleDelay: vi.fn(() => 789),
      cancelDelay,
      refreshNow: vi.fn(),
      onRefreshingChange: vi.fn(),
    });

    await controller.trigger();
    controller.dispose();

    expect(cancelDelay).toHaveBeenCalledWith(789);
    expect(controller.isRefreshing()).toBe(false);
  });
});
