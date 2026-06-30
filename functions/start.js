// Helper to get the IP range (subnet) to handle mobile data IP rotation
function getSubnet(ip) {
  if (ip.includes('.')) {
    // IPv4: "172.56.21.4" -> "172.56.21"
    return ip.split('.').slice(0, 3).join('.');
  } else if (ip.includes(':')) {
    // IPv6: "2001:db8:3c4d:15:0:0:abcd:ef12" -> "2001:db8:3c4d:15"
    return ip.split(':').slice(0, 4).join(':');
  }
  return ip;
}

export async function onRequest(context) {
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_KEY;

  const userIP = context.request.headers.get("cf-connecting-ip") || "unknown-ip";
  const subnet = getSubnet(userIP);
  const ticket = "SUB-" + subnet;

  // Save the IP range ticket to Supabase
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

  const linkvertiseUrl = "https://link-hub.net/6931596/TGdANQjZ05vc";

  return new Response(null, {
    status: 302,
    headers: {
      'Location': linkvertiseUrl
    }
  });
}
