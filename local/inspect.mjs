import {openScope} from './scope.mjs';import {analyzeAssets} from './analysis.mjs';
if(process.argv.length!==3){console.error('Usage: node local/inspect.mjs ROOT');process.exit(2)}
try{console.log(JSON.stringify(await analyzeAssets(await openScope(process.argv[2])),null,2));}catch(e){console.error(e.code?'Local filesystem request refused':e.message);process.exitCode=1;}
