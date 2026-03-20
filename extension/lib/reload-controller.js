/**
 * Pure reload orchestration helper. No GJS imports.
 *
 * @param {{
 *   signalCore: () => Promise<void>,
 *   scheduleDelay: (seconds: number, callback: () => void) => unknown,
 *   cancelDelay: (id: unknown) => void,
 *   refreshNow: () => void,
 *   onRefreshingChange: (refreshing: boolean) => void,
 *   delaySeconds?: number,
 *   logError?: (error: unknown) => void,
 * }} deps
 * @returns {{ trigger: () => Promise<boolean>, dispose: () => void, isRefreshing: () => boolean }}
 */
export function createReloadController(deps) {
  const {
    signalCore,
    scheduleDelay,
    cancelDelay,
    refreshNow,
    onRefreshingChange,
    delaySeconds = 3,
    logError = () => {},
  } = deps;

  let refreshing = false;
  let timeoutId = null;

  function finishRefresh() {
    timeoutId = null;
    refreshing = false;
    onRefreshingChange(false);
    refreshNow();
  }

  return {
    async trigger() {
      if (refreshing) return false;
      refreshing = true;
      onRefreshingChange(true);

      try {
        await signalCore();
      } catch (error) {
        refreshing = false;
        onRefreshingChange(false);
        logError(error);
        refreshNow();
        return false;
      }

      timeoutId = scheduleDelay(delaySeconds, () => {
        finishRefresh();
      });
      return true;
    },

    dispose() {
      if (timeoutId != null) {
        cancelDelay(timeoutId);
        timeoutId = null;
      }
      refreshing = false;
      onRefreshingChange(false);
    },

    isRefreshing() {
      return refreshing;
    },
  };
}
