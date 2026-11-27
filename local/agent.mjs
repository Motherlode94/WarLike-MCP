import {createRouter,serve} from './protocol.mjs';
await serve(process.stdin,process.stdout,createRouter());
