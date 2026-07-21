// Triggered by a Database Webhook on `public.notifications` INSERT.
// Only forwards notifications marked `notify_email = true` (new orders,
// due-soon/overdue orders, and trial-date reminders) to email — every
// other notification stays bell-only in the app.
//
// Deploy via Supabase Dashboard -> Edge Functions -> Create a function
// (paste this file), then set the RESEND_API_KEY secret under
// Edge Functions -> Manage secrets, then wire a Database Webhook on
// notifications INSERT -> this function.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const TO_EMAIL = 'achuthofficial@gmail.com'
const FROM_EMAIL = 'Change Seasons <onboarding@resend.dev>'

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()
    const record = payload?.record

    if (!record || record.notify_email !== true) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY secret is not set')
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject: 'Changing Seasons — Boutique Alert',
        text: record.message,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Resend API error:', res.status, errText)
      return new Response(JSON.stringify({ error: errText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-notification-email failed:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
