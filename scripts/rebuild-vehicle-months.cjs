// Rebuild month counters only, using an explicit recovery plan's destination UID.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const plan=JSON.parse(fs.readFileSync(process.argv[2]+'/plan.json','utf8'));
const token=execFileSync('gcloud.cmd',['auth','print-access-token'],{shell:true,encoding:'utf8'}).trim();
const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json','x-goog-user-project':plan.project};
const root=`https://firestore.googleapis.com/v1/projects/${plan.project}/databases/(default)/documents`;
async function request(url,body){const r=await fetch(url,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw new Error(d.error?.message||'Request failed');return d;}
async function list(collection){let docs=[],page='';do{const d=await request(`${root}/workspaces/${plan.uid}/${collection}?pageSize=1000${page?'&pageToken='+encodeURIComponent(page):''}`);docs.push(...(d.documents||[]));page=d.nextPageToken;}while(page);return docs;}
(async()=>{
 const trips=await list('tripEntries'),vehicles=await list('vehicles'),months={};
 for(const trip of trips){const v=trip.fields.vehicleKey.stringValue,m=trip.fields.date.stringValue.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);if(!m)throw new Error('Invalid date');const key=m[3]+'-'+m[2];months[v]??={};months[v][key]=(months[v][key]||0)+1;}
 const writes=vehicles.map(doc=>({update:{name:doc.name,fields:{monthCounts:{mapValue:{fields:Object.fromEntries(Object.entries(months[doc.name.split('/').pop()]||{}).map(([k,v])=>[k,{integerValue:String(v)}]))}}}},updateMask:{fieldPaths:['monthCounts']},currentDocument:{updateTime:doc.updateTime}}));
 const output=path.join(process.argv[2],'vehicle-months-before.json');if(!fs.existsSync(output))fs.writeFileSync(output,JSON.stringify(vehicles,null,2));
 if(!process.argv.includes('--apply')){console.log(`Plan: update only month counters for ${writes.length} vehicles.`);return;}
 await request(root+':commit',{writes});
 for(const doc of await list('vehicles')){const expected=months[doc.name.split('/').pop()]||{},actual=Object.fromEntries(Object.entries(doc.fields.monthCounts.mapValue.fields||{}).map(([k,v])=>[k,Number(v.integerValue)]));for(const k of new Set([...Object.keys(expected),...Object.keys(actual)]))if(actual[k]!==expected[k])throw new Error('Verification mismatch');}
 console.log(`Verified vehicle month counters for ${vehicles.length} vehicles / ${trips.length} trips; business fields unchanged.`);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
