export async function onRequest(context) {
  const url = new URL(context.request.url);
  const key = url.searchParams.get("key");

  if (!key) return new Response('game.Players.LocalPlayer:Kick("No key provided.")', { status: 400 });

  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

  // 1. Validate Key & Check Expiration
  const dbResponse = await fetch(`${supabaseUrl}/rest/v1/keys?key_value=eq.${key}&is_active=eq.true&select=expires_at`, { headers });
  const data = await dbResponse.json();

  if (!data || data.length === 0) {
    return new Response('game.Players.LocalPlayer:Kick("Invalid Key.")', { status: 403 });
  }

  const expiresAt = data[0].expires_at;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return new Response('game.Players.LocalPlayer:Kick("Your Key has expired! Get a new one.")', { status: 403 });
  }

  // 2. Fetch the Live Script
  const scriptRes = await fetch(`${supabaseUrl}/rest/v1/scripts?id=eq.main&select=script_text`, { headers });
  const scriptData = await scriptRes.json();
  
  const validScript = scriptData[0]?.script_text || 'print("Admin has not set a script yet.")';

  return new Response(validScript, { status: 200 });
} 
