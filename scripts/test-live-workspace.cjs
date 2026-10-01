const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),babel=require('@babel/core'),assert=require('node:assert/strict');
const appSDK=require('firebase/app'),authSDK=require('firebase/auth'),dbSDK=require('firebase/firestore');
const credentials=JSON.parse(fs.readFileSync(path.join(process.env.USERPROFILE,'Documents/TripTrack-test-access/test-account.json'),'utf8').replace(/^\uFEFF/,''));
if(credentials.email!=='testuser92@gmail.com'||credentials.project!=='vehicle2-79fd6')throw new Error('Refusing non-test credentials.');
const config=JSON.parse(fs.readFileSync('android/app/google-services.json','utf8'));
const app=appSDK.initializeApp({projectId:credentials.project,apiKey:config.client[0].api_key[0].current_key,appId:config.client[0].client_info.mobilesdk_app_id},'dedicated-live-qa');
const auth=authSDK.getAuth(app),db=dbSDK.getFirestore(app);
const collections=['tripEntries','loads','archivedTrips','parties','vehicles','drivers','fromcustomers','customers'];
const folder='.local-backup/dedicated-live-qa';fs.mkdirSync(folder,{recursive:true});
const root=`workspaces/${credentials.uid}`;
const cache=new Map();
const mocks={'@react-native-firebase/firestore':{...dbSDK,getFirestore:()=>db},'@react-native-firebase/app':{getApps:()=>[app]},'@react-native-firebase/auth':{getAuth:()=>auth}};
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const m=new Module(file,module);cache.set(file,m);m.paths=Module._nodeModulePaths(path.dirname(file));m.require=name=>mocks[name]||(name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.js')):require(name));m._compile(babel.transformFileSync(file,{babelrc:false,configFile:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code,file);return m.exports;}
(async()=>{
 await authSDK.signInWithEmailAndPassword(auth,credentials.email,credentials.password);assert.equal(auth.currentUser.uid,credentials.uid);
 const snapshots={};for(const c of collections){snapshots[c]=(await dbSDK.getDocsFromServer(dbSDK.collection(db,root,c))).docs.map(d=>({id:d.id,data:d.data()}));}
 const baselineFile=path.join(folder,'baseline.json');
 if(process.argv.includes('--cleanup')){
  if(!fs.existsSync(baselineFile))throw new Error('No owned fixture manifest; refusing cleanup.');
  const baseline=JSON.parse(fs.readFileSync(baselineFile));assert.equal(baseline.uid,credentials.uid);
  const owned=new Set(JSON.parse(fs.readFileSync(path.join(folder,'created-paths.json'))));
  let batch=dbSDK.writeBatch(db),n=0,total=0;
  for(const c of collections)for(const d of snapshots[c]){const p=`${root}/${c}/${d.id}`;if(owned.has(p)&&!baseline.collections[c].some(old=>old.id===d.id)){batch.delete(dbSDK.doc(db,p));n++;total++;if(n===400){await batch.commit();batch=dbSDK.writeBatch(db);n=0;}}}
  if(n)await batch.commit();
  for(const c of collections){const after=await dbSDK.getDocsFromServer(dbSDK.collection(db,root,c));assert.equal(after.size,baseline.collections[c].length);}
  fs.writeFileSync(path.join(folder,'cleanup.json'),JSON.stringify({uid:credentials.uid,deleted:total,verified:true,time:new Date().toISOString()},null,2));console.log('PASS: dedicated live test records removed; baseline counts restored.');return;
 }
 if(Object.values(snapshots).some(rows=>rows.length))throw new Error('Test workspace is not empty; refusing to overwrite data.');
 fs.writeFileSync(baselineFile,JSON.stringify({uid:credentials.uid,collections:snapshots},null,2));
 const scope=load('src/services/workspace.js');scope.activateWorkspace(credentials.uid);
 const {tripService,vehicleTripService}=load('src/config/firebase.js');
 const trip={clientId:'qa-live-lifecycle',vehicleNo:'QA92TEST',driverName:'Test Driver',date:'30-09-2026',dateTimestamp:dbSDK.Timestamp.fromDate(new Date(2026,8,30)),amount:0,locations:[{from:'QA Warehouse\nGate 2',to:'QA Alpha'},{from:'QA Depot',to:'QA Beta'}]};
 const ownedFile=path.join(folder,'created-paths.json');
 async function remember(){const paths=[];for(const c of collections){const q=await dbSDK.getDocsFromServer(dbSDK.collection(db,root,c));for(const d of q.docs)paths.push(d.ref.path);}fs.writeFileSync(ownedFile,JSON.stringify(paths,null,2));}
 try {
 const id=await tripService.addTrip(trip);await tripService.addTrip(trip);
 assert.equal((await tripService.getTripPage()).trips.length,1);assert.equal((await tripService.getLoadPage()).trips.length,2);
 const party=(await vehicleTripService.getPartySummaries()).find(p=>p.to==='QA Alpha');
 const ownRows=(await tripService.getLoadPage({partyId:party.id})).trips;assert.equal(ownRows.length,1);assert.equal(ownRows[0].to,'QA Alpha');assert.equal(ownRows[0].from,'QA Warehouse\nGate 2');
 await tripService.updateTrip(id,{date:'01-10-2026',dateTimestamp:dbSDK.Timestamp.fromDate(new Date(2026,9,1)),locations:[trip.locations[0]]});
 assert.equal((await tripService.getLoadPage()).trips.length,1);assert.equal((await vehicleTripService.getVehicleSummary('QA92TEST')).monthCounts['2026-10'],1);
 assert.equal((await tripService.getLoadPage({month:'2026-09',fromDate:new Date(2026,9,1)})).trips.length,0);
 await tripService.deleteTrip(id);assert.equal((await tripService.getLoadPage()).trips.length,0);await tripService.restoreTrip(id);assert.equal((await tripService.getLoadPage()).trips.length,1);
 await assert.rejects(()=>dbSDK.getDocsFromServer(dbSDK.collection(db,'workspaces/YWwrxrYVJ1cTXx8i9dKK2RwmCN43/loads')),/permission/i);
 const {loadRecords}=load('src/utils/loadRecords.js');const batch=dbSDK.writeBatch(db);
 for(let i=0;i<45;i++){
  const parentId=`qa-table-${i}`,record={...trip,clientId:parentId,createdAt:dbSDK.Timestamp.now(),vehicleKey:'QA92TEST',locations:[{...trip.locations[0],partyId:party.id},{...trip.locations[1],partyId:'party:qa%20beta'}],partyIds:[party.id,'party:qa%20beta'],partyKeys:['qa alpha','qa beta']};
  batch.set(dbSDK.doc(db,root,'tripEntries',parentId),record);for(const{id:loadId,...row}of loadRecords(parentId,record))batch.set(dbSDK.doc(db,root,'loads',loadId),row);
 }
 batch.set(dbSDK.doc(db,root,'vehicles','QA92TEST'),{vehicleNo:'QA92TEST',loadCount:46,monthCounts:{'2026-09':45,'2026-10':1},lastTripAt:dbSDK.Timestamp.fromDate(new Date(2026,9,1))});
 for(const[name,count]of[['QA Alpha',46],['QA Beta',45]]){const pid=name==='QA Alpha'?party.id:'party:qa%20beta';batch.set(dbSDK.doc(db,root,'parties',pid),{to:name,partyKey:name.toLowerCase(),loadCount:count,monthCounts:{'2026-09':45,...(name==='QA Alpha'?{'2026-10':1}:{})}});batch.set(dbSDK.doc(db,root,'customers','qa-'+name.split(' ')[1].toLowerCase()),{msName:name,msnamelower:name.toLowerCase(),phone:'',address:'QA test data'});}
 await batch.commit();await remember();
 const first=await tripService.getLoadPage();const second=await tripService.getLoadPage({cursor:first.cursor});const third=await tripService.getLoadPage({cursor:second.cursor});assert.equal(new Set([...first.trips,...second.trips,...third.trips].map(r=>r.id)).size,91);
 for(const sortField of ['dateTimestamp','createdAt','amount']){assert.equal((await tripService.getLoadPage({sortField,search:'warehouse'})).trips.length,40);}
 fs.writeFileSync(path.join(folder,'verified.json'),JSON.stringify({email:credentials.email,uid:credentials.uid,trips:46,pairs:91,tests:['create','idempotent retry','party separation','multiline','edit','month totals','archive','restore','cross-user denied','3-page pagination','search/sorts'],time:new Date().toISOString()},null,2));
 console.log('PASS: live test user create/edit/archive/restore, no duplicate retry, isolated pairs, month totals, cross-user denial, search and 91-row pagination. Synthetic fixtures retained only in testuser92 for device QA.');
 } finally {await remember();}
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{await dbSDK.terminate(db);await appSDK.deleteApp(app);});
