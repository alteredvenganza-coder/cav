export default async function handler(req, res) {
  const { code } = req.query;
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).send('OAuth env vars missing');
    return;
  }
  if (!code) {
    res.status(400).send('Missing code');
    return;
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    const data = await tokenRes.json();

    const payload = data.access_token
      ? { token: data.access_token, provider: 'github' }
      : { error: data.error || 'token_exchange_failed' };
    const status = data.access_token ? 'success' : 'error';
    const msg = `authorization:github:${status}:${JSON.stringify(payload)}`;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`<!doctype html><html><body><script>
      (function() {
        function send(){ window.opener && window.opener.postMessage(${JSON.stringify(msg)}, '*'); }
        window.addEventListener('message', function(e){ if (e.data === 'authorizing:github') send(); }, false);
        send();
        setTimeout(function(){ window.close(); }, 800);
      })();
    </script><p>Login complete. You can close this window.</p></body></html>`);
  } catch (err) {
    res.status(500).send('OAuth error: ' + err.message);
  }
}
