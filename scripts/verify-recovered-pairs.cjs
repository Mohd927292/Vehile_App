// Verify the recovered pair model and the deployed indexes without writing records.
const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const folder=process.argv[2];if(!folder)throw new Error('Provide recovery plan directory');
const plan=JSON.parse(fs.readFileSync(folder+'/plan.json','utf8'));
const token=execFileSync('gcloud.cmd',['auth','print-access-token'],{encoding:'utf8',shell:true}).trim();
const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json','x-goog-user-project':plan.project};
(async()=>{
 const expected=plan.writes.filter(w=>w.update.name.includes('/loads/')).map(w=>w.update);
 const sample=expected[0].fields;
 for(const sortField of ['dateTimestamp','createdAt','amount'])for(const direction of ['ASCENDING','DESCENDING'])for(const scope of [null,'partyId','vehicleKey'])for(const search of [false,true]){
  const filters=[];if(scope)filters.push({fieldFilter:{field:{fieldPath:scope},op:'EQUAL',value:sample[scope]}});
  if(search)filters.push({fieldFilter:{field:{fieldPath:'searchTokens'},op:'ARRAY_CONTAINS',value:sample.searchTokens.arrayValue.values[0]}});
  const query={from:[{collectionId:'loads'}],orderBy:[{field:{fieldPath:sortField},direction}],limit:500};if(filters.length)query.where=filters.length===1?filters[0]:{compositeFilter:{op:'AND',filters}};
  const response=await fetch(`https://firestore.googleapis.com/v1/projects/${plan.project}/databases/(default)/documents/workspaces/${plan.uid}:runQuery`,{method:'POST',headers,body:JSON.stringify({structuredQuery:query})});const data=await response.json();if(!response.ok)throw new Error(JSON.stringify(data));
  const rows=data.filter(row=>row.document).map(row=>row.document);
  const count=expected.filter(row=>(!scope||row.fields[scope].stringValue===sample[scope].stringValue)&&(!search||row.fields.searchTokens.arrayValue.values.some(v=>v.stringValue===sample.searchTokens.arrayValue.values[0].stringValue))).length;
  if(rows.length!==count)throw new Error('Count mismatch');for(const row of rows){if(row.fields.locations.arrayValue.values.length!==1)throw new Error('Mixed pair');}
  console.log(`${sortField}/${scope||'all'}/${search?'search':'browse'}/${direction}: ${count} correct pair rows`);
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
