import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost,onRequestGet} from '../functions/mcp.js';

test('MCP proxy refuses requests without a bearer and never forwards them',async()=>{
 const req=new Request('https://warlike-mcp.pages.dev/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 const res=await onRequestPost({request:req});
 assert.equal(res.status,401);
});
test('MCP proxy forwards JSON-RPC requests only to WarLike Server and strips cookies',async()=>{
 const original=globalThis.fetch;
 let destination='',options=null;
 globalThis.fetch=async(url,init)=>{destination=url;options=init;return Response.json({jsonrpc:'2.0',id:1,result:{tools:[]}})};
 try{
  const token='a'.repeat(40);
  const req=new Request('https://warlike-mcp.pages.dev/mcp',{method:'POST',headers:{Authorization:'Bearer '+token,Cookie:'session=secret','Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})});
  const res=await onRequestPost({request:req});
  assert.equal(res.status,200);
  assert.equal(destination,'https://warlike-server.pages.dev/api/mcp');
  assert.equal(options.headers.Authorization,'Bearer '+token);
  assert.equal('Cookie' in options.headers,false);
  assert.equal((await res.json()).jsonrpc,'2.0');
 }finally{globalThis.fetch=original}
});
test('MCP informational endpoint does not misrepresent an undeployed backend as operational',async()=>{
 const res=await onRequestGet();
 const value=await res.json();
 assert.equal(value.backend,'WarLike Server');
 assert.equal(value.ready,false);
});
