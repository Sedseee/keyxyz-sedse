export async function onRequest(context) {
  const url = new URL(context.request.url);
  const rawUrl = context.request.url;
  
  // 1. ROBUST QUERY PARSER (Fixes the Linkvertise double '?' parameter bug)
  let hash = url.searchParams.get("hash");
  if (!hash) {
    const hashMatch = rawUrl.match(/(?:\?|&)hash=([a-zA-Z0-9\-]+)/);
    if (hashMatch) {
      hash = hashMatch[1];
    }
  }

  let provider = url.searchParams.get("provider");

  // 2. AUTO-DETECT PROVIDER (Bypasses any query string stripping)
  if (hash) {
    if (hash.length === 36 && hash.includes("-")) {
      provider = "workink";
    } else if (hash.length === 64) {
      provider = "linkvertise";
    }
  }

  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

  let isVerified = false;
  let debugMessage = "";

  // --- 1. WORK.INK VERIFICATION ---
  if (provider === "workink" && hash) {
    const workinkUrl = `https://work.ink/_api/v2/token/isValid/${hash}?deleteToken=1`;
    try {
      const res = await fetch(workinkUrl);
      const data = await res.json();
      if (data && data.valid === true) {
        isVerified = true;
      } else {
        debugMessage = `Work.ink verification failed. API returned: ${JSON.stringify(data)}. Hash tried: ${hash}`;
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
      } else {
        debugMessage = `Linkvertise verification failed. API returned: "${responseText}". Checked hash: ${hash}`;
      }
    } catch (err) {
      return new Response("Verification Error: Failed to reach Linkvertise validation server.", { status: 500 });
    }
  }
  
  // --- 3. LOOTLABS VERIFICATION (IP/Subnet Mismatch Fix) ---
  else if (provider === "lootlabs") {
    const userIP = context.request.headers.get("cf-connecting-ip") || "unknown-ip";
    
    // Extract subnet (handles mobile/network shifts and IPv4 vs IPv6 issues)
    const ipParts = userIP.includes('.') ? userIP.split('.').slice(0, 3).join('.') : userIP.split(':').slice(0, 4).join(':');

    // Fetch all pending LootLabs postbacks (fixed 'like.LOOT-*' wildcard operator)
    const checkRes = await fetch(`${supabaseUrl}/rest/v1/keys?key_value=like.LOOT-*&is_active=eq.false`, { headers });
    const checkData = await checkRes.json();

    // Safety check to ensure we received a list of keys and not a database error
    if (Array.isArray(checkData)) {
      // Look for a database ticket matching either your exact IP or your Subnet range
      const matchingTicket = checkData.find(row => {
        const ticketIP = row.key_value.replace("LOOT-", "");
        return ticketIP === userIP || ticketIP.startsWith(ipParts);
      });

      if (matchingTicket) {
        isVerified = true;
        // Clear the temporary ticket
        await fetch(`${supabaseUrl}/rest/v1/keys?key_value=eq.${matchingTicket.key_value}`, {
          method: 'DELETE',
          headers: headers
        });
      } else {
        debugMessage = `No LootLabs postback matched. Your current IP: ${userIP}. DB tickets found: ${JSON.stringify(checkData.map(r => r.key_value))}`;
      }
    } else {
      debugMessage = `Supabase query error. Received: ${JSON.stringify(checkData)}`;
    }
  } else {
    debugMessage = `No provider matched. Raw URL parsed: hash=${hash}, provider=${provider}`;
  }

  // IF VERIFICATION FAILS: Show custom diagnostic screen to the user
  if (!isVerified) {
    const htmlError = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Failed</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600&family=JetBrains+Mono&display=swap');
            body { 
                font-family: 'Plus Jakarta Sans', sans-serif; 
                background: #030712; color: #f3f4f6; 
                padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; box-sizing: border-box;
            }
            .box { 
                background: #0b0f19; border: 1px solid rgba(255,255,255,0.06); 
                padding: 30px; max-width: 460px; width: 100%; border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5); box-sizing: border-box;
            }
            h2 { font-size: 18px; margin-top: 0; color: #f43f5e; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 12px;}
            p { font-size: 14px; line-height: 1.5; margin: 16px 0; }
            pre { 
                font-family: 'JetBrains Mono', monospace; background: rgba(0,0,0,0.3); 
                padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); 
                font-size: 12px; color: #a1a1aa; white-space: pre-wrap; word-break: break-all;
            }
        </style>
    </head>
    <body>
        <div class="box">
            <h2>Verification Unsuccessful</h2>
            <p>Your ad completion could not be validated by the security layer.</p>
            <pre>> Diagnostics:\n${debugMessage}</pre>
            <p style="color: #5aabf2; font-size: 13px; margin-bottom: 0;">Try going back and completing the ad node again. Avoid using VPNs or ad blockers.</p>
        </div>
    </body>
    </html>
    `;
    return new Response(htmlError, { headers: { 'Content-Type': 'text/html' }, status: 403 });
  }

  // --- 4. VERIFICATION SUCCESSFUL -> GENERATE REAL KEY ---
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const newKey = `SEDSE-${randomPart}`;

  await fetch(`${supabaseUrl}/rest/v1/keys`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      key_value: newKey,
      is_active: true
    })
  });

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Key</title>
      <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600&family=JetBrains+Mono&display=swap');
          body { 
              font-family: 'Plus Jakarta Sans', sans-serif; 
              background-color: #030712;
              background-image: 
                  linear-gradient(rgba(3, 7, 18, 0.85), rgba(3, 7, 18, 0.85)), 
                  url('/bg.jpg');
              background-size: cover; background-position: center; background-attachment: fixed;
              color: #f3f4f6; padding: 20px; min-height: 100vh;
              display: flex; justify-content: center; align-items: center; margin: 0; box-sizing: border-box;
          }
          .container {
              width: 100%; max-width: 440px;
              background: rgba(11, 15, 25, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
              border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
              padding: 32px 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); box-sizing: border-box; text-align: center;
          }
          h2 { margin: 0 0 6px 0; font-size: 20px; font-weight: 600; color: #f3f4f6; letter-spacing: -0.5px; }
          p { font-size: 14px; color: #9ca3af; margin: 0 0 24px 0; line-height: 1.5; }
          .key-box { 
              background: rgba(0,0,0,0.3); border: 2px solid #5aabf2; padding: 20px; 
              font-size: 24px; color: #5aabf2; border-radius: 10px; display: inline-block; 
              margin: 10px 0; letter-spacing: 2px; font-family: 'JetBrains Mono', monospace; font-weight: bold;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <h2>Verification Complete</h2>
          <p>Thank you for supporting SEDSE. Your script key is ready:</p>
          <div class="key-box">${newKey}</div>
      </div>
  </body>
  </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
