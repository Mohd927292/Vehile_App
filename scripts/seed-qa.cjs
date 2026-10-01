const fs=require('node:fs'),path=require('node:path'),babel=require('@babel/core'),Module=require('node:module');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,setDoc,Timestamp,writeBatch}=require('firebase/firestore');
(async()=>{
 const auth=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=qa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@example.test',password:'test-only-123',returnSecureToken:true})});let account=await auth.json();if(!account.localId){const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=qa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@example.test',password:'test-only-123',returnSecureToken:true})});account=await response.json();}if(!account.localId)throw new Error('QA sign-in failed');
 const env=await initializeTestEnvironment({projectId:'demo-triptrack',firestore:{host:'127.0.0.1',port:8080,rules:fs.readFileSync('firestore.rules','utf8')}});
 await env.clearFirestore();
 const filename=path.resolve('src/utils/loadRecords.js'),mod=new Module(filename,module);mod._compile(babel.transformFileSync(filename,{babelrc:false,configFile:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code,filename);
 await env.withSecurityRulesDisabled(async context=>{
 const db=context.firestore();for(const [uid,name,role]of[[account.localId,'QA Administrator','admin'],['qa-user','QA User','user']])await setDoc(doc(db,'staff',uid),{email:uid===account.localId?'admin@example.test':'user@example.test',displayName:name,role,active:true});
 for(const owner of [account.localId,'qa-user']){
  let batch=writeBatch(db),count=0;
  for(let i=0;i<120;i++){
   const id='qa-trip-'+i,trip={date:'30-09-2026',dateTimestamp:Timestamp.fromDate(new Date(2026,8,30)),createdAt:Timestamp.fromMillis(1790720000000+i*1000),vehicleNo:'KA01QA1234',vehicleKey:'KA01QA1234',driverName:owner==='qa-user'?'Other User Driver':'Admin Driver',amount:0,locations:[{partyId:'alpha',from:'Warehouse entrance\nGate 2 — upper floor',to:'Alpha Party'},{partyId:'beta',from:'Second depot',to:'Beta Party'}],partyIds:['alpha','beta'],partyKeys:['alpha party','beta party']};
   batch.set(doc(db,'workspaces',owner,'tripEntries',id),trip);count++;
   for(const{id:loadId,...load}of mod.exports.loadRecords(id,trip)){batch.set(doc(db,'workspaces',owner,'loads',loadId),load);count++;}
   if(count>=300){await batch.commit();batch=writeBatch(db);count=0;}
  }if(count)await batch.commit();
  for(const[id,name]of[['alpha','Alpha Party'],['beta','Beta Party']]){await setDoc(doc(db,'workspaces',owner,'parties',id),{to:name,partyKey:name.toLowerCase(),loadCount:120,monthCounts:{'2026-09':120}});await setDoc(doc(db,'workspaces',owner,'customers',id),{msName:name,msnamelower:name.toLowerCase()});}
  await setDoc(doc(db,'workspaces',owner,'vehicles','KA01QA1234'),{vehicleNo:'KA01QA1234',loadCount:120});
 }
 });await env.cleanup();console.log('QA emulator fixtures ready: two users, 240 vehicle trips, 480 pair records.');
})().catch(error=>{console.error(error);process.exitCode=1;});
