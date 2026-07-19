import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load .env manually
const envFile = fs.readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(
  envFile.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env credentials!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Check push_subscriptions
  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('*');

  if (subErr) {
    console.error("Error fetching push_subscriptions:", subErr);
  } else {
    console.log(`=== PUSH SUBSCRIPTIONS (${subs.length}) ===`);
    console.log(JSON.stringify(subs, null, 2));
  }

  console.log("\n");

  // Check scheduled_notifications
  const { data: notifs, error: notifErr } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .order('fire_at', { ascending: false })
    .limit(10);

  if (notifErr) {
    console.error("Error fetching scheduled_notifications:", notifErr);
  } else {
    console.log(`=== SCHEDULED NOTIFICATIONS (${notifs.length}) ===`);
    console.log(JSON.stringify(notifs, null, 2));
  }
}

main().catch(console.error);
