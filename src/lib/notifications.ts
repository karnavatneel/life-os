/**
 * Notification helper — bridges the React app to the Service Worker.
 *
 * Usage:
 *   import { requestNotificationPermission, scheduleNotification, cancelNotification, syncScheduleToSW } from '@/lib/notifications';
 */

// ─── Permission ───────────────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function notificationsGranted(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

// ─── SW messenger ─────────────────────────────────────────────────────────────
async function sendToSW(msg: object) {
  const reg = await getRegistration();
  if (!reg?.active) return;
  reg.active.postMessage(msg);
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.ready; } catch { return null; }
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  fireAt: number; // unix ms
  fired?: boolean;
}

/**
 * Schedule a notification to fire at a specific time (or after a delay).
 * Works while app is open (SW timer) AND when app is closed (periodic sync).
 */
export async function scheduleNotification(n: ScheduledNotification) {
  if (!notificationsGranted()) return;
  const delayMs = Math.max(0, n.fireAt - Date.now());
  // Send to SW for immediate setTimeout-based firing if the page is alive
  await sendToSW({ type: 'SCHEDULE_NOTIFICATION', ...n, delayMs });
}

export async function cancelNotification(id: string) {
  await sendToSW({ type: 'CANCEL_NOTIFICATION', id });
}

/**
 * Call this whenever the schedule changes so the SW has the latest list
 * for periodic background sync (fires even when app is closed).
 */
export async function syncScheduleToSW(schedule: ScheduledNotification[]) {
  await sendToSW({ type: 'SYNC_SCHEDULE', schedule });
}

// ─── Register periodic sync ───────────────────────────────────────────────────
export async function registerPeriodicSync() {
  try {
    const reg = await getRegistration();
    if (!reg) return;
    // periodicSync is not yet in all TS libs — use type assertion
    const regAny = reg as unknown as { periodicSync?: { register: (tag: string, opts: object) => Promise<void> } };
    if (regAny.periodicSync) {
      await regAny.periodicSync.register('life-os-notify', { minInterval: 15 * 60 * 1000 }); // 15 min
    }
  } catch (_) {
    // Not supported — fall back gracefully (SW timers still work while tab is open)
  }
}

// ─── Convenience: daily reminder at a given HH:MM ────────────────────────────
export function buildDailyFireAt(timeStr: string): number {
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const now = new Date();
  const fire = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  if (fire <= now) fire.setDate(fire.getDate() + 1); // already passed today → tomorrow
  return fire.getTime();
}
