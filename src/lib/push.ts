/**
 * Real Web Push subscription — this is what makes notifications survive the
 * app being fully closed/killed on mobile, unlike the old periodicSync-only
 * approach (which iOS doesn't support at all, and Android only fires
 * inconsistently).
 */
import { supabase, isSupabaseConfigured } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray.buffer;
}

/**
 * Subscribes this browser to Web Push and stores the subscription in
 * Supabase (tied to the logged-in user via RLS). Safe to call repeatedly —
 * it's a no-op if push isn't supported, Supabase isn't configured, or the
 * user isn't logged in.
 */
export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (!VAPID_PUBLIC_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY is not set — real push notifications are disabled.');
      return false;
    }
    if (!isSupabaseConfigured || !supabase) return false;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = sub.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: session.user.id,
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      },
      { onConflict: 'endpoint' },
    );
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Push subscription failed:', e);
    return false;
  }
}
