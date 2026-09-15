import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const exts=['.ts','.tsx','.js','.jsx','.mjs','.json'];
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.next','.git'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx|js|jsx|mjs)$/.test(e.name))files.push(p)}}
walk(root);
const missing=[];
function existsModule(rel){
  const base=path.resolve(root,rel);
  if(fs.existsSync(base)&&fs.statSync(base).isFile()) return true;
  for(const ext of exts) if(fs.existsSync(base+ext)) return true;
  if(fs.existsSync(path.join(base,'index.ts'))||fs.existsSync(path.join(base,'index.tsx'))) return true;
  return false;
}
for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  const re=/from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g; let m;
  while((m=re.exec(src))){const spec=m[1]||m[2]; if(spec.startsWith('@/')){const rel=spec.slice(2); if(!existsModule(rel))missing.push(`${path.relative(root,file)} -> ${spec}`);} else if(spec.startsWith('.')){const rel=path.relative(root,path.resolve(path.dirname(file),spec)); if(!existsModule(rel))missing.push(`${path.relative(root,file)} -> ${spec}`);}}
}
if(missing.length){console.error(missing.join('\n'));process.exit(1)}
console.log(`FINANZAS 360 import contract: OK (${files.length} source files)`);
