export async function onRequest(context) {
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;

  // 1. Get the user's IP address (Cloudflare provides this automatically)
  const userIP = context.request.headers.get("cf-connecting-ip") || "unknown-ip";
  const ticket = "IP-" + userIP;

  // 2. Save the IP ticket to Supabase (is_active = false)
  await fetch(`${supabaseUrl}/rest/v1/keys`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      key_value: ticket,
      is_active: false
    })
  });

  // 3. Redirect to Linkvertise (No cookies needed!)
  const linkvertiseUrl = "https://link-hub.net/6931596/TGdANQjZ05vc";

  return new Response(null, {
    status: 302,
    headers: {
      'Location': linkvertiseUrl
    }
  });
}
