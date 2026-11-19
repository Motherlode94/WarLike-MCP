// Cloudflare Pages Function: thin MCP transport, backed by the existing WarLike Server.
// It holds no session state or secret. All authentication, rate limits and D1 queues
// belong to WarLike Server; this endpoint never accesses the local computer.
const target='https://warlike-server.pages.dev/api/mcp';
export async function onRequestPost({request}){
 const authorization=request.headers.get('authorization');
 if(!authorization||!/^Bearer\s+\S{32,}$/.test(authorization))return Response.json({error:'MCP bearer required'}, {status:401});
 const raw=await request.text();
 if(raw.length>16384)return Response.json({error:'Payload too large'},{status:413});
 const upstream=await fetch(target,{method:'POST',headers:{'Authorization':authorization,'Content-Type':'application/json','Accept':'application/json'},body:raw,redirect:'error',cf:{cacheTtl:0}});
 return new Response(upstream.body,{status:upstream.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export async function onRequestGet(){return Response.json({name:'WarLike MCP',transport:'Streamable HTTP (JSON-RPC over POST)',endpoint:'/mcp',backend:'WarLike Server',ready:false,note:'Requires deployed Server MCP route and credentials; GET is informational.'},{headers:{'Cache-Control':'no-store'}})}
