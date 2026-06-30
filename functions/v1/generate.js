export async function onRequest(context) {
  // 1. Generate a random key (e.g., SEDSE-A1B2C3D4)
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const newKey = `SEDSE-${randomPart}`;

  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;

  // 2. Save the new key to your Supabase Database
  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/keys`, {
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

  if (!insertResponse.ok) {
    return new Response("Database error. Could not generate key.", { status: 500 });
  }

  // 3. Display the Key to the User
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Key</title>
      <style>
          body { font-family: sans-serif; background: #121212; color: white; text-align: center; padding-top: 50px; }
          .key-box { background: #222; border: 2px solid #007bff; padding: 20px; font-size: 24px; color: #00ff00; border-radius: 10px; display: inline-block; margin: 20px; letter-spacing: 2px;}
          button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; }
      </style>
  </head>
  <body>
      <h2>Verification Complete!</h2>
      <p>Thank you. Your generated key is:</p>
      <div class="key-box" id="keyText">${newKey}</div>
      <br>
  </body>
  </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
