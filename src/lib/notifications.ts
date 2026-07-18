/**
 * Notification helper — bridges the React app to the Service Worker AND,
 * when Supabase is configured, to a server-side schedule so notifications
 * still fire via real Web Push when the app/browser is fully closed.
 *
 * Usage:
 *   import { requestNotificationPermission, scheduleNotification, cancelNotification, syncScheduleToSW } from '@/lib/notifications';
 */
import { supabase, isSupabaseConfigured } from './supabase';

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
 * for periodic background sync (best-effort, works while the browser
 * keeps the SW alive), AND so the server-side schedule used for real Web
 * Push delivery (works even when the app is fully closed / killed) stays
 * in sync.
 */
export async function syncScheduleToSW(schedule: ScheduledNotification[]) {
  await sendToSW({ type: 'SYNC_SCHEDULE', schedule });
  await syncScheduleToServer(schedule);
}

/**
 * Upserts the (future, unfired) schedule into public.scheduled_notifications
 * and removes any rows that are no longer part of the schedule (e.g. a habit
 * reminder was turned off). No-ops if Supabase isn't configured or the user
 * isn't logged in — the local SW path still works in that case.
 */
async function syncScheduleToServer(schedule: ScheduledNotification[]) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const userId = session.user.id;

    const upcoming = schedule.filter((n) => n.fireAt > Date.now());
    if (upcoming.length > 0) {
      const { error } = await supabase.from('scheduled_notifications').upsert(
        upcoming.map((n) => ({
          id: n.id,
          user_id: userId,
          title: n.title,
          body: n.body,
          fire_at: new Date(n.fireAt).toISOString(),
          fired: false,
        })),
      );
      if (error) throw error;
    }

    // Remove stale rows for ids no longer in the schedule (e.g. reminder disabled).
    const { data: existing } = await supabase
      .from('scheduled_notifications')
      .select('id')
      .eq('user_id', userId);
    const keepIds = new Set(upcoming.map((n) => n.id));
    const staleIds = (existing ?? []).map((r) => r.id).filter((id) => !keepIds.has(id));
    if (staleIds.length > 0) {
      await supabase.from('scheduled_notifications').delete().in('id', staleIds);
    }
  } catch (e) {
    console.error('Failed to sync notification schedule to server:', e);
  }
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
