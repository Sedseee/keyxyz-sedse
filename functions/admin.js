export async function onRequest(context) {
  if (context.request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  
  const req = await context.request.json();
  
  // PASSWORD CHECK
  if (req.password !== "sedse321") {
    return new Response(JSON.stringify({ error: "Unauthorized: Incorrect Password" }), { status: 401 });
  }

  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' };

  // ACTION 1: SAVE SCRIPT
  if (req.action === "save_script") {
    await fetch(`${supabaseUrl}/rest/v1/scripts?id=eq.main`, {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify({ script_text: req.script })
    });
    return new Response(JSON.stringify({ success: true }));
  }

  // ACTION 2: GENERATE KEY
  if (req.action === "generate_key") {
    const newKey = "SEDSE-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    let expiresAt = null; // Default to Lifetime

    if (req.duration === "12h") {
      expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    } else if (req.duration === "24h") {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    await fetch(`${supabaseUrl}/rest/v1/keys`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ key_value: newKey, is_active: true, expires_at: expiresAt })
    });
    return new Response(JSON.stringify({ key: newKey }));
  }

  return new Response("Invalid Action", { status: 400 });
      } 
