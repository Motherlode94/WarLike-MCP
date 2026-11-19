// Cloudflare Pages transport relay. WarLike Server remains the sole authority
// for authorization, tool registration, session ownership and command execution.
const TARGET = 'https://warlike-server.pages.dev/api/mcp';
const MAX_BODY_BYTES = 16 * 1024;
const TIMEOUT_MS = 15000;
const responseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
const reply = (body, status) => Response.json(body, { status, headers: responseHeaders });
const rpcError = (id, code, message, status) =>
  reply({ jsonrpc: '2.0', id, error: { code, message } }, status);

async function readLimitedBody(request) {
  if (request.headers.has('content-length')) {
    const n = Number(request.headers.get('content-length'));
    if (!Number.isSafeInteger(n) || n < 0 || n > MAX_BODY_BYTES) return null;
  }
  if (!request.body) return '';
  const reader = request.body.getReader();
  const parts = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(combined);
}

export async function onRequestPost({ request }) {
  const authorization = request.headers.get('authorization');
  if (!authorization || !/^Bearer [A-Za-z0-9._~+/-]{32,}={0,2}$/.test(authorization)) {
    return reply({ error: 'MCP bearer required' }, 401);
  }

  const mediaType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') return reply({ error: 'JSON content type required' }, 415);

  let raw;
  try {
    raw = await readLimitedBody(request);
  } catch {
    return rpcError(null, -32700, 'Invalid request body', 400);
  }
  if (raw === null) return reply({ error: 'Payload too large' }, 413);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return rpcError(null, -32700, 'Parse error', 400);
  }
  // This relay intentionally supports a single JSON-RPC message per request.
  // Reject batch payloads so no caller can bypass per-request controls.
  const validId = parsed?.id === undefined ||
    parsed.id === null || typeof parsed.id === 'string' ||
    (typeof parsed.id === 'number' && Number.isFinite(parsed.id));
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object' ||
    parsed.jsonrpc !== '2.0' || typeof parsed.method !== 'string' ||
    !parsed.method || !validId) {
    return rpcError(null, -32600, 'Invalid JSON-RPC request', 400);
  }

  try {
    const upstream = await fetch(TARGET, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: raw,
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cf: { cacheTtl: 0 },
    });
    // The backend decides auth, permissions, tool availability and JSON-RPC
    // method behavior; no cookies or other client headers are forwarded.
    if (upstream.status === 204) {
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }
    const upstreamType = upstream.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
    if (upstreamType !== 'application/json') {
      upstream.body?.cancel().catch(() => {});
      return rpcError(parsed.id ?? null, -32603, 'Unexpected backend response', 502);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return rpcError(parsed.id ?? null, -32603, 'WarLike Server unavailable', 502);
  }
}

export async function onRequestGet() {
  return reply({
    name: 'WarLike MCP',
    transport: 'JSON-RPC over HTTPS POST',
    endpoint: '/mcp',
    backend: 'WarLike Server',
    ready: false,
    note: 'Informational response only; no backend health or tool readiness verified.',
  }, 200);
}
export async function onRequestOptions() {
  return new Response(null, { status: 405, headers: { Allow: 'GET, POST', 'Cache-Control': 'no-store' } });
}
