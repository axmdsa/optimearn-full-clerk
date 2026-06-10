/**
 * Detect the user's device type based on user agent
 */
export function detectDevice(): 'iOS' | 'Android' | 'PC' {
  if (typeof window === 'undefined') return 'PC';
  
  const ua = navigator.userAgent.toLowerCase();
  
  // iOS detection
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'iOS';
  }
  
  // Android detection
  if (/android/.test(ua)) {
    return 'Android';
  }
  
  // Default to PC for desktop browsers
  return 'PC';
}

/**
 * Get device name for display
 */
export function getDeviceName(device: 'iOS' | 'Android' | 'PC'): string {
  switch (device) {
    case 'iOS':
      return 'iPhone/iPad';
    case 'Android':
      return 'Android';
    case 'PC':
      return 'Computer';
    default:
      return 'Unknown';
  }
}

/**
 * Check if a device is compatible with target devices
 */
export function isDeviceCompatible(userDevice: 'iOS' | 'Android' | 'PC', targetDevicesJson: string | null): boolean {
  if (!targetDevicesJson) return true; // No restrictions
  
  try {
    const targetDevices = JSON.parse(targetDevicesJson) as string[];
    return targetDevices.includes(userDevice);
  } catch {
    return true; // If parsing fails, assume compatible
  }
}

/**
 * Get incompatible device names from target devices
 */
export function getIncompatibleDevices(userDevice: 'iOS' | 'Android' | 'PC', targetDevicesJson: string | null): string[] {
  if (!targetDevicesJson) return [];
  
  try {
    const targetDevices = JSON.parse(targetDevicesJson) as string[];
    return targetDevices.filter(d => d !== userDevice).map(d => getDeviceName(d as 'iOS' | 'Android' | 'PC'));
  } catch {
    return [];
  }
}
