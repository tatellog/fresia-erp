// Proxy hacia Mercado Pago Point (Orders API). El access token vive aquí
// como secreto del proyecto (MP_ACCESS_TOKEN): la PWA nunca lo ve, y solo
// usuarios autenticados de Supabase pueden invocar esta función.
//
// Desplegar:  supabase functions deploy mp
// Secreto:    supabase secrets set MP_ACCESS_TOKEN=APP_USR-...

const MP = 'https://api.mercadopago.com'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const token = Deno.env.get('MP_ACCESS_TOKEN')
  if (!token) return json({ error: 'Falta configurar el secreto MP_ACCESS_TOKEN en Supabase' }, 500)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400)
  }

  const mp = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${MP}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
        ...(init.headers ?? {}),
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data?.errors?.[0]?.message ?? data?.message ?? `Mercado Pago respondió ${res.status}`
      throw new Error(msg)
    }
    return data
  }

  try {
    switch (body.action) {
      // terminales de la cuenta, para elegir cuál usa este local
      case 'terminals': {
        const data = await mp('/terminals/v1/list?limit=50')
        return json({ terminals: data?.data?.terminals ?? [] })
      }

      // modo PDV: la terminal deja de operar sola y espera órdenes de la API
      case 'mode': {
        const data = await mp('/terminals/v1/setup', {
          method: 'PATCH',
          body: JSON.stringify({ terminals: [{ id: body.terminal_id, operating_mode: body.mode }] }),
        })
        return json(data)
      }

      // crea la orden y la manda a la terminal; expira en 5 minutos
      case 'charge': {
        const amount = Number(body.amount)
        if (!Number.isFinite(amount) || amount <= 0) return json({ error: 'Monto inválido' }, 400)
        const data = await mp('/v1/orders', {
          method: 'POST',
          body: JSON.stringify({
            type: 'point',
            external_reference: String(body.reference ?? crypto.randomUUID()).slice(0, 64),
            expiration_time: 'PT5M',
            description: 'Frésia · fresas con crema',
            transactions: { payments: [{ amount: amount.toFixed(2) }] },
            config: { point: { terminal_id: body.terminal_id } },
          }),
        })
        return json({ order_id: data.id, status: data.status })
      }

      case 'status': {
        const data = await mp(`/v1/orders/${body.order_id}`)
        return json({ status: data.status, status_detail: data.status_detail })
      }

      case 'cancel': {
        const data = await mp(`/v1/orders/${body.order_id}/cancel`, { method: 'POST' })
        return json({ status: data.status })
      }

      default:
        return json({ error: 'Acción no reconocida' }, 400)
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
})
