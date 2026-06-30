export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response('print("No key provided.");', { status: 400 });
  }

  // Get environment variables
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;

  // Check the key in Supabase via REST API
  const dbResponse = await fetch(
    `${supabaseUrl}/rest/v1/keys?key_value=eq.${key}&is_active=eq.true`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  );

  const data = await dbResponse.json();

  if (data.length > 0) {
    // KEY IS VALID! 
    // Paste your obfuscated script text right here inside the backticks
    const validScript = `
print("Key Validated. Loading SEDSE script...")
-- YOUR OBFUSCATED SCRIPT GOES HERE
    `;
    return new Response(validScript, { status: 200 });
  } else {
    // KEY IS INVALID
    return new Response('game.Players.LocalPlayer:Kick("Invalid or Expired Key.")', { status: 403 });
  }
}
