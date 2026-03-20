import { describe, expect, it } from 'vitest';
import { getBatteryCoreLauncherPath, getSignalCoreCommand } from '../lib/core-launcher.js';

describe('getBatteryCoreLauncherPath', () => {
  it('points at the installed user-local core launcher', () => {
    expect(getBatteryCoreLauncherPath('/home/alice'))
      .toBe('/home/alice/.local/share/battery/core/battery-core.sh');
  });
});

describe('getSignalCoreCommand', () => {
  it('returns the systemctl command to send SIGUSR2 to the core service', () => {
    expect(getSignalCoreCommand()).toEqual([
      'systemctl', '--user', 'kill', '--kill-who=main', '-s', 'SIGUSR2', 'battery-core.service',
    ]);
  });
});
