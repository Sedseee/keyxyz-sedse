export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // LootLabs will send the user's IP in the query parameter
  const ip = url.searchParams.get("ip");

  if (!ip) {
    return new Response("Missing IP address parameter.", { status: 400 });
  }

  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;

  const ticket = "LOOT-" + ip;

  // Insert a temporary LootLabs verified ticket into Supabase
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

  return new Response("OK", { status: 200 });
}
