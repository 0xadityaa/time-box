import { prisma } from '@time-box/db';

let globalCapturePayloads = false;

export async function fetchSystemSettings() {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'global' },
    });

    if (settings) {
      globalCapturePayloads = settings.capturePayloads;
    } else {
      // Create default settings if they don't exist
      const defaultSettings = await prisma.systemSettings.create({
        data: {
          id: 'global',
          capturePayloads: false, // Privacy by default
          retentionDays: 30,
        },
      });
      globalCapturePayloads = defaultSettings.capturePayloads;
    }
  } catch (err) {
    console.error('[Settings] Failed to fetch system settings:', err);
  }
}

export function isCapturePayloadsEnabled() {
  return globalCapturePayloads;
}

export function startSettingsPoller() {
  // Fetch immediately
  fetchSystemSettings();

  // Poll every 30 seconds
  setInterval(fetchSystemSettings, 30 * 1000);
}
