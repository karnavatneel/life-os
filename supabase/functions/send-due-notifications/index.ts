// supabase/functions/send-due-notifications/index.ts
//
// Sends real Web Push notifications (works even when the app / browser is
// fully closed) for any due rows in public.scheduled_notifications.
// Meant to be invoked on a schedule (every 1-2 minutes) by pg_cron + pg_net.
//
// Deploy:  supabase functions deploy send-due-notifications --no-verify-jwt
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
//          (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically)

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    // Simple shared-secret guard so randoms on the internet can't trigger sends.
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (cronSecret) {
      const provided = req.headers.get('x-cron-secret');
      if (provided !== cronSecret) {
        return new Response('unauthorized', { status: 401 });
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: due, error } = await supabase
      .from('scheduled_notifications')
      .select('id, user_id, title, body')
      .eq('fired', false)
      .lte('fire_at', new Date().toISOString())
      .limit(200);

    if (error) throw error;
    if (!due || due.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
    }

    const userIds = [...new Set(due.map((d) => d.user_id))];
    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .in('user_id', userIds);
    if (subErr) throw subErr;

    let sent = 0;
    const staleSubIds: string[] = [];
    const firedIds: string[] = [];

    for (const notif of due) {
      const userSubs = (subs ?? []).filter((s) => s.user_id === notif.user_id);
      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({ title: notif.title, body: notif.body, tag: notif.id }),
          );
          sent++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) staleSubIds.push(sub.id);
          console.error('push send failed for sub', sub.id, e);
        }
      }
      firedIds.push(notif.id);
    }

    if (firedIds.length) {
      await supabase.from('scheduled_notifications').update({ fired: true }).in('id', firedIds);
    }
    if (staleSubIds.length) {
      await supabase.from('push_subscriptions').delete().in('id', staleSubIds);
    }

    return new Response(JSON.stringify({ due: due.length, sent, cleaned: staleSubIds.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
