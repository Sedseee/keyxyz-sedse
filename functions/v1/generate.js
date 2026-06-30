export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hash = url.searchParams.get("hash"); // Linkvertise and Work.ink both use this
  const provider = url.searchParams.get("provider"); // Can be "linkvertise", "workink", "lootlabs"

  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

  let isVerified = false;

  // --- 1. WORK.INK VERIFICATION ---
  if (provider === "workink" && hash) {
    // Work.ink Key System API validation. We add deleteToken=1 to auto-destroy it on check.
    const workinkUrl = `https://work.ink/_api/v2/token/isValid/${hash}?deleteToken=1`;
    try {
      const res = await fetch(workinkUrl);
      const data = await res.json();
      if (data && data.valid === true) {
        isVerified = true;
      }
    } catch (e) {
      return new Response("Verification Error: Failed to reach Work.ink validation server.", { status: 500 });
    }
  }
  
  // --- 2. LINKVERTISE VERIFICATION ---
  else if (provider === "linkvertise" && hash) {
    const linkvertiseToken = context.env.LINKVERTISE_TOKEN;
    const validationUrl = `https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${linkvertiseToken}&hash=${hash}`;
    try {
      const linkvertiseRes = await fetch(validationUrl, { method: 'POST' });
      const responseText = await linkvertiseRes.text();
      if (responseText.toUpperCase().includes("TRUE")) {
        isVerified = true;
      }
    } catch (err) {
      return new Response("Verification Error: Failed to reach Linkvertise validation server.", { status: 500 });
    }
  }
  
  // --- 3. LOOTLABS VERIFICATION ---
  else if (provider === "lootlabs") {
    const userIP = context.request.headers.get("cf-connecting-ip") || "unknown-ip";
    const ticket = "LOOT-" + userIP;

    // Check if LootLabs successfully pinged our postback endpoint for this IP
    const checkRes = await fetch(`${supabaseUrl}/rest/v1/keys?key_value=eq.${ticket}&is_active=eq.false`, { headers });
    const checkData = await checkRes.json();

    if (checkData && checkData.length > 0) {
      isVerified = true;
      
      // Delete the temporary postback ticket so it cannot be reused
      await fetch(`${supabaseUrl}/rest/v1/keys?key_value=eq.${ticket}`, {
        method: 'DELETE',
        headers: headers
      });
    }
  }

  // If validation fails
  if (!isVerified) {
    return new Response("Bypass Detected: Verification failed or expired. Please complete the tasks properly.", { status: 403 });
  }

  // --- 4. VERIFICATION SUCCESSFUL -> GENERATE REAL KEY ---
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const newKey = `SEDSE-${randomPart}`;

  // Save the real key to Supabase
  const dbResponse = await fetch(`${supabaseUrl}/rest/v1/keys`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      key_value: newKey,
      is_active: true
    })
  });

  if (!dbResponse.ok) {
    return new Response("Database Error: Key generated but could not be saved.", { status: 500 });
  }

  // Return success HTML
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Key</title>
      <style>
          body { font-family: sans-serif; background: #121212; color: white; text-align: center; padding-top: 50px; }
          .key-box { background: #222; border: 2px solid #00ff00; padding: 20px; font-size: 24px; color: #00ff00; border-radius: 10px; display: inline-block; margin: 20px; letter-spacing: 2px;}
      </style>
  </head>
  <body>
      <h2>Verification Complete!</h2>
      <p>Thank you for supporting SEDSE. Your key is:</p>
      <div class="key-box">${newKey}</div>
  </body>
  </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
    }
