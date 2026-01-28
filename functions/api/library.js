export async function onRequest(context) {
  const GITHUB_RAW_URL = "";

  try {
    const response = await fetch(GITHUB_RAW_URL, {
      headers: {
        "Authorization": `token ${context.env.GH_TOKEN}`,
        "User-Agent": "Cloudflare-Pages-Function"
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `GitHub Error: ${response.status}` }), {
        status: 503, headers: { "content-type": "application/json" }
      });
    }

    const data = await response.text();

    return new Response(data, {
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
