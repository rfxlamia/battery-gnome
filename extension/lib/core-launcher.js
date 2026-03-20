/**
 * Core launcher helpers — pure helpers, no GJS dependencies.
 * GJS runtime use: Gio.Subprocess.new([launcherPath, 'login'], Gio.SubprocessFlags.NONE)
 */

/**
 * @param {string} homeDir
 * @returns {string}
 */
export function getBatteryCoreLauncherPath(homeDir) {
  return `${homeDir}/.local/share/battery/core/battery-core.sh`;
}

/**
 * @param {string} homeDir
 * @returns {string[]}
 */
export function getBatteryCoreLoginCommand(homeDir) {
  return [getBatteryCoreLauncherPath(homeDir), 'login'];
}

/**
 * @returns {string[]}
 */
export function getSignalCoreCommand() {
  return ['systemctl', '--user', 'kill', '--kill-who=main', '-s', 'SIGUSR2', 'battery-core.service'];
}
