export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // Linkvertise automatically appends "?hash=..." to your target URL when redirecting
  const hash = url.searchParams.get("hash");

  if (!hash) {
    return new Response("Bypass Detected: Missing secure verification hash. You must complete the linkvertise.", { status: 403 });
  }

  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;
  const linkvertiseToken = context.env.LINKVERTISE_TOKEN;

  // 1. Validate the hash with Linkvertise's official verification API
  const validationUrl = `https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${linkvertiseToken}&hash=${hash}`;
  
  try {
    const linkvertiseRes = await fetch(validationUrl, { method: 'POST' });
    const responseText = await linkvertiseRes.text();

    // Linkvertise returns "true" if the hash is valid, and "false" or an error if bypassed
    if (!responseText.toUpperCase().includes("TRUE")) {
      return new Response("Bypass Detected: Invalid or expired verification hash.", { status: 403 });
    }
  } catch (err) {
    return new Response("Verification Error: Failed to reach the ad validation server.", { status: 500 });
  }

  // 2. Hash is verified! Generate the actual key
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const newKey = `SEDSE-${randomPart}`;

  // 3. Save the real key to Supabase
  const dbResponse = await fetch(`${supabaseUrl}/rest/v1/keys`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      key_value: newKey,
      is_active: true
    })
  });

  if (!dbResponse.ok) {
    return new Response("Database Error: Key generated but could not be saved.", { status: 500 });
  }

  // 4. Return success page to the user
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
