// Triggered by a Database Webhook on `public.orders` UPDATE. The moment an
// order's status flips to "Ready", sends the customer a real, automated
// WhatsApp message — no one has to click anything. This is the automated
// counterpart to the free "Send Message" button in the app
// (src/utils/whatsapp.js), which still works as a no-cost manual fallback
// and isn't removed by wiring this up.
//
// Requires, from the Meta WhatsApp Business Cloud API:
//   - a WHATSAPP_PHONE_NUMBER_ID secret (the Business phone number's ID)
//   - a WHATSAPP_ACCESS_TOKEN secret (a permanent access token, not one of
//     the 24-hour temporary tokens Meta's UI defaults to)
//   - one approved message template, since this is a business-initiated
//     message (not a reply inside a live customer chat) — Meta rejects
//     anything else. Submit exactly this for approval before wiring this
//     up (Utility category — it's the cheapest and fastest to approve):
//       name: order_ready
//       language: English (en_US)
//       body: "Hi {{1}}, your order ORD-{{2}} ({{3}}) is ready for pickup
//              at Changing Seasons. Thank you!"
//     (matches the free wa.me message wording, for continuity)
//
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided to every Edge
// Function automatically — no need to set those two yourself.
//
// Deploy via Supabase Dashboard -> Edge Functions -> Create a function
// (paste this file), set the two WHATSAPP_* secrets under Edge Functions ->
// Manage secrets, then wire a Database Webhook on `orders` UPDATE -> this
// function (Database -> Webhooks -> Create a new hook).

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function digitsOnly(phone: string) {
  return (phone ?? '').replace(/\D/g, '')
}

async function fetchFromSupabase(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY ?? '',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`Supabase REST fetch failed (${path}): ${res.status}`)
  return res.json()
}

function garmentLabel(item: { garment_type: string; garment_type_other?: string | null }) {
  return item.garment_type === 'Other' ? item.garment_type_other || 'Other' : item.garment_type
}

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()
    const order = payload?.record
    const previous = payload?.old_record

    // Only fire on the transition INTO "Ready" — not on every subsequent
    // edit made while an order is already Ready.
    if (!order || order.order_status !== 'Ready' || previous?.order_status === 'Ready') {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.error('WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID secrets are not set')
      return new Response(JSON.stringify({ error: 'WhatsApp secrets not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const [customers, items] = await Promise.all([
      fetchFromSupabase(`users?id=eq.${order.customer_id}&select=name,phone`),
      fetchFromSupabase(`order_items?order_id=eq.${order.id}&select=garment_type,garment_type_other,quantity`),
    ])

    const customer = customers?.[0]
    if (!customer?.phone) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no customer phone on file' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const garmentSummary = (items ?? [])
      .map((i: { quantity: number }) => (i.quantity > 1 ? `${garmentLabel(i)} x ${i.quantity}` : garmentLabel(i)))
      .join(', ')

    const res = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: digitsOnly(customer.phone),
        type: 'template',
        template: {
          name: 'order_ready',
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customer.name },
                { type: 'text', text: String(order.id) },
                { type: 'text', text: garmentSummary || 'your order' },
              ],
            },
          ],
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('WhatsApp API error:', res.status, errText)
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
    console.error('send-whatsapp-order-ready failed:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
