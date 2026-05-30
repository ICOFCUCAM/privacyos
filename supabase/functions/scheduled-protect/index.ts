// Supabase Edge Function: scheduled-protect
//
// Thin trigger for the always-on protection cycle. It calls the deployed app's
// CRON_SECRET-guarded /api/cron endpoint, where the full orchestration logic
// lives (so scheduled and interactive runs share the exact same code path).
//
// Deploy:   supabase functions deploy scheduled-protect --no-verify-jwt
// Secrets:  supabase secrets set APP_URL=https://your-app CRON_SECRET=...
// Schedule: see supabase/migrations/0003_cron.sql (pg_cron), or invoke from the
//           Supabase dashboard's scheduled triggers.
//
// deno-lint-ignore-file
declare const Deno: { env: { get(k: string): string | undefined }; serve(h: (req: Request) => Response | Promise<Response>): void };

Deno.serve(async (_req: Request) => {
  const appUrl = Deno.env.get("APP_URL");
  const secret = Deno.env.get("CRON_SECRET");

  if (!appUrl) {
    return new Response(JSON.stringify({ error: "APP_URL not set" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const res = await fetch(`${appUrl}/api/cron`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret ? { authorization: `Bearer ${secret}` } : {}),
    },
  });

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
});
