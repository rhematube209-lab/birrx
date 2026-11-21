// supabase/functions/_shared/delete-account.ts
function accountDeletionHandler(config, fetcher = fetch) {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info", "Access-Control-Allow-Methods": "POST,OPTIONS", "Content-Type": "application/json", "Cache-Control": "no-store" };
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
  return async (request) => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply(405, { error: "Use POST." });
    const token = request.headers.get("Authorization");
    if (!token?.startsWith("Bearer ")) return reply(401, { error: "Sign in to delete your account." });
    if (!config.url || !config.serviceKey) return reply(503, { error: "Account deletion is not configured." });
    try {
      if (Number(request.headers.get("content-length") || 0) > 1024) return reply(413, { error: "Request too large." });
      const body = await request.text();
      if (body.length > 1024) return reply(413, { error: "Request too large." });
      let input;
      try {
        input = JSON.parse(body);
      } catch {
        return reply(400, { error: "Invalid request." });
      }
      if (input?.confirmation !== "DELETE") return reply(400, { error: "Explicit deletion confirmation is required." });
      const admin = { apikey: config.serviceKey, Authorization: "Bearer " + config.serviceKey, "Content-Type": "application/json" };
      const verified = await fetcher(config.url + "/auth/v1/user", { headers: { apikey: config.serviceKey, Authorization: token }, signal: AbortSignal.timeout(15e3) });
      if (!verified.ok) return reply(401, { error: "Sign in again before deleting your account." });
      const user = await verified.json();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id || "")) return reply(401, { error: "Invalid account." });
      const age = Date.now() - Date.parse(user.last_sign_in_at || "");
      if (!Number.isFinite(age) || age < -6e4 || age > 3e5) return reply(401, { error: "Verify your password again before deleting your account." });
      const counters = await fetcher(config.url + "/rest/v1/rpc/birrx_delete_my_usage", { method: "POST", headers: admin, body: JSON.stringify({ p_user_id: user.id }), signal: AbortSignal.timeout(15e3) });
      if (!counters.ok) return reply(503, { error: "Account cleanup is unavailable. Nothing was marked complete. Please retry later." });
      const revoked = await fetcher(config.url + "/auth/v1/logout?scope=global", { method: "POST", headers: { apikey: config.serviceKey, Authorization: token }, signal: AbortSignal.timeout(15e3) });
      if (!revoked.ok) return reply(503, { error: "Could not revoke account sessions. Sign in again and retry deletion." });
      const deleted = await fetcher(config.url + "/auth/v1/admin/users/" + user.id, { method: "DELETE", headers: admin, signal: AbortSignal.timeout(15e3) });
      if (!deleted.ok) return reply(503, { error: "Account deletion did not complete. Please retry later." });
      return reply(200, { deleted: true });
    } catch {
      return reply(503, { error: "Account deletion could not connect. Please retry later." });
    }
  };
}

// supabase/functions/delete-account/index.ts
Deno.serve(accountDeletionHandler({ url: Deno.env.get("SUPABASE_URL") || "", serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "" }));
