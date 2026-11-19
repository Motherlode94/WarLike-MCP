import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, onRequestGet, onRequestOptions } from '../functions/mcp.js';

const token = 'a'.repeat(40);
const rpc = (method='tools/list') => JSON.stringify({ jsonrpc:'2.0', id: 1, method });
const request = (body=rpc(), headers={}) => new Request('https://warlike-mcp.pages.dev/mcp', {
  method:'POST', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json', ...headers }, body,
});

test('unauthenticated clients cannot access backend', async () => {
  const res = await onRequestPost({ request: request(rpc(), { Authorization:'' }) });
  assert.equal(res.status,401);
});
test('content-type is restricted', async () => {
  assert.equal((await onRequestPost({request:request(rpc(), {'Content-Type':'text/plain'})})).status,415);
});
test('malformed and batch JSON-RPC never reach backend', async () => {
  for (const body of ['{', '[]', '{}', '[{"jsonrpc":"2.0","method":"tools/list"}]', '{"jsonrpc":"2.0","method":123}', '{"jsonrpc":"1.0","method":"tools/list"}']) {
    const response = await onRequestPost({request:request(body)});
    assert.equal(response.status,400);
  }
});
test('content-length and streaming byte limits are enforced', async () => {
  const large = JSON.stringify({jsonrpc:'2.0',method:'tools/list',payload:'é'.repeat(10000)});
  assert.equal((await onRequestPost({request:request(large)})).status,413);
  assert.equal((await onRequestPost({request:request(rpc(), {'Content-Length':'999999'})})).status,413);
});
test('requests forward solely to WarLike Server without cookies or arbitrary headers',async()=>{
  const previous = globalThis.fetch;
  let destination,options;
  globalThis.fetch = async (url, init) => {
    destination=url;options=init;
    return Response.json({jsonrpc:'2.0',id:1,result:{tools:[]}});
  };
  try {
    const response=await onRequestPost({request:request(rpc(), { Cookie:'session=secret', 'X-Admin':'true' })});
    assert.equal(response.status,200);
    assert.equal(destination,'https://warlike-server.pages.dev/api/mcp');
    assert.equal(options.headers.Authorization,'Bearer '+token);
    assert.equal('Cookie' in options.headers,false);
    assert.equal('X-Admin' in options.headers,false);
    assert.equal(options.redirect,'error');
    assert.equal((await response.json()).jsonrpc,'2.0');
    assert.equal(response.headers.get('Cache-Control'),'no-store');
  } finally {globalThis.fetch=previous}
});
test('backend outage returns a safe 502 without leaking details',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>{throw Error('private backend error')};
  try {
    const res=await onRequestPost({request:request()});
    assert.equal(res.status,502);
    assert.doesNotMatch(await res.text(),/private backend error/);
  } finally {globalThis.fetch=previous}
});
test('unexpected upstream content type is rejected',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>new Response('<html>bad</html>',{status:200,headers:{'Content-Type':'text/html'}});
  try {assert.equal((await onRequestPost({request:request()})).status,502)}
  finally {globalThis.fetch=previous}
});
test('204 notification acknowledgments are supported',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>new Response(null,{status:204});
  try {assert.equal((await onRequestPost({request:request(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'}))})).status,204)}
  finally {globalThis.fetch=previous}
});
test('GET is informational and OPTIONS forbids broad CORS',async()=>{
  const res=await onRequestGet();
  assert.equal((await res.json()).ready,false);
  const options=await onRequestOptions();
  assert.equal(options.status,405);
  assert.equal(options.headers.get('Access-Control-Allow-Origin'),null);
});
