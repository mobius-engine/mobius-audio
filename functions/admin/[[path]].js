// /admin and everything under it is the admin panel, a Cloud Run service (kindle-author-leads/admin in
// mobius-engine/kindle-author-leads). Forward the request as-is, cookies and redirects included, so the panel
// lives on this domain. The service does its own sign-in; nothing here grants access.
const ORIGIN = "https://audiobooks-admin-976035609728.us-west1.run.app";

export async function onRequest({ request }) {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", url.host);
  const init = { method: request.method, headers, redirect: "manual" };
  if (!["GET", "HEAD"].includes(request.method)) init.body = await request.arrayBuffer();
  return fetch(ORIGIN + url.pathname + url.search, init);
}
