// An SFDX auth URL (force://clientId:secret:refreshToken@instance) becomes a session: a refresh-token exchange, then a
// one-time frontdoor link that logs a browser in as that user. Plain fetch, nothing stored.
const FORMAT = /^force:\/\/([^:]+):([^:]*):(.+)@([^@]+)$/;

/** → { frontdoor, userId, instanceUrl, host } for the user the auth URL belongs to. */
export async function sessionFromAuthUrl(authUrl, { retUrl, fetchImpl = fetch } = {}) {
  const m = FORMAT.exec(String(authUrl).trim());
  if (!m) throw new Error('The auth URL should look like force://…@your-domain.my.salesforce.com.');
  const [, clientId, secret, refresh, instance] = m;
  const base = instance.startsWith('http') ? instance : `https://${instance}`;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refresh,
    ...(secret ? { client_secret: secret } : {}),
  });
  const res = await fetchImpl(`${base}/services/oauth2/token`, { method: 'POST', body });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token)
    throw new Error(`Salesforce did not accept the auth URL: ${j.error_description ?? j.error ?? res.status}`);
  const back = retUrl ? `&retURL=${encodeURIComponent(retUrl)}` : '';
  return {
    frontdoor: `${j.instance_url}/secur/frontdoor.jsp?sid=${encodeURIComponent(j.access_token)}${back}`,
    userId: String(j.id ?? '').split('/').pop() || '',
    instanceUrl: j.instance_url,
    host: new URL(j.instance_url).host,
  };
}
