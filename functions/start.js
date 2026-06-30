export async function onRequest(context) {
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;

  // 1. Generate a random temporary session ticket
  const ticket = "PENDING-" + Math.random().toString(36).substring(2, 15);

  // 2. Save ticket to your existing Supabase table (is_active = false)
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

  // 3. Set a cookie on their browser and redirect to your Linkvertise
  const linkvertiseUrl = "https://link-hub.net/6931596/TGdANQjZ05vc";
  
  return new Response(null, {
    status: 302,
    headers: {
      'Location': linkvertiseUrl,
      'Set-Cookie': `session=${ticket}; HttpOnly; Path=/; Max-Age=600; Secure`
    }
  });
}
