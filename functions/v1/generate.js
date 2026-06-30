export async function onRequest(context) {
  // 1. Get the user's IP address
  const userIP = context.request.headers.get("cf-connecting-ip") || "unknown-ip";
  const ticket = "IP-" + userIP;
  
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

  // 2. Verify the IP ticket in Supabase
  const checkRes = await fetch(`${supabaseUrl}/rest/v1/keys?key_value=eq.${ticket}&is_active=eq.false&select=created_at`, { headers });
  const checkData = await checkRes.json();

  if (!checkData || checkData.length === 0) {
    return new Response("Bypass Detected: No session found for your IP. You must start at /start.", { status: 403 });
  }

  // 3. Anti-Bypass Tool Time Check (Grab the most recent click)
  const createdAt = new Date(checkData[checkData.length - 1].created_at).getTime();
  const timeDiff = (Date.now() - createdAt) / 1000;

  if (timeDiff < 12) {
    return new Response(`Bypass Detected: You completed the link too fast! (${Math.round(timeDiff)}s). Real users take longer.`, { status: 403 });
  }

  // 4. Security checks passed! Generate real key
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const newKey = `SEDSE-${randomPart}`;

  // Save the real key
  await fetch(`${supabaseUrl}/rest/v1/keys`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ key_value: newKey, is_active: true })
  });

  // 5. Delete the IP ticket so they can't reuse it
  await fetch(`${supabaseUrl}/rest/v1/keys?key_value=eq.${ticket}`, {
    method: 'DELETE',
    headers: headers
  });

  // 6. Return HTML
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
