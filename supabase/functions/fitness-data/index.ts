// supabase/functions/fitness-data/index.ts
//
// Proxies Google Fitness API calls server-side to avoid CORS restrictions.
// The browser sends its Google access_token; this function calls the
// Fitness REST API and returns steps + calories for today.
//
// Deploy: supabase functions deploy fitness-data --no-verify-jwt

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { access_token } = await req.json();

    if (!access_token) {
      return json({ error: 'access_token is required' }, 400);
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const body = {
      aggregateBy: [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.calories.expended' },
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startOfToday.getTime(),
      endTimeMillis: endOfToday.getTime(),
    };

    const res = await fetch(
      'https://www.googleapis.com/fitness/v1/users/me/dataset/aggregate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'fitness_api_error' }));
      return json({ error: err.error?.message ?? 'fitness_api_error', status: res.status }, res.status);
    }

    const data = await res.json();

    let steps = 0;
    let calories = 0;

    if (data.bucket && data.bucket.length > 0) {
      const bucket = data.bucket[0];
      if (bucket.dataset) {
        const stepDataset = bucket.dataset[0];
        const calorieDataset = bucket.dataset[1];

        if (stepDataset?.point) {
          stepDataset.point.forEach((pt: any) => {
            pt.value?.forEach((val: any) => { steps += val.intVal ?? 0; });
          });
        }

        if (calorieDataset?.point) {
          calorieDataset.point.forEach((pt: any) => {
            pt.value?.forEach((val: any) => { calories += Math.round(val.fpVal ?? 0); });
          });
        }
      }
    }

    return json({ steps, calories }, 200);
  } catch (e) {
    return json({ error: 'internal_error', detail: String(e) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
