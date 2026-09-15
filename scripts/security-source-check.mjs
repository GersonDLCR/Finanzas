import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const skip=new Set(['node_modules','.next','.git']);
const bad=[];
const patterns=[
  [/sk-[A-Za-z0-9_-]{20,}/,'OpenAI-like secret'],
  [/AIza[0-9A-Za-z_-]{20,}/,'Google API key'],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,'private key'],
  [/(?:password|passwd|secret|api[_-]?key)\s*[:=]\s*["'][^"']{12,}["']/i,'hardcoded secret-like assignment']
];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx|js|jsx|mjs|json|sql|md|env)$/.test(e.name)){const s=fs.readFileSync(p,'utf8');for(const [rx,label] of patterns)if(rx.test(s))bad.push(`${path.relative(root,p)}: ${label}`)}}}
walk(root);
if(bad.length){console.error(bad.join('\n'));process.exit(1)}
console.log('FINANZAS 360 security source scan: OK');
