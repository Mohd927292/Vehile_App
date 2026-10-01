const fs = require('node:fs'),
  path = require('node:path'),
  { execFileSync } = require('node:child_process'),
  babel = require('@babel/core'),
  Module = require('node:module');
const project = 'vehicle2-79fd6',
  email = '92rnamashuk@gmail.com';
const token = execFileSync('gcloud.cmd', ['auth', 'print-access-token'], {
  encoding: 'utf8',
  shell: true,
}).trim();
const headers = {
  Authorization: `Bearer ${token}`,
  'x-goog-user-project': project,
  'Content-Type': 'application/json',
};
const root = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const names = [
  'tripEntries',
  'loads',
  'archivedTrips',
  'customers',
  'parties',
  'vehicles',
  'drivers',
  'fromcustomers',
];
async function api(url, body) {
  const res = await fetch(url, {
    headers,
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`);
  return data;
}
async function list(collection) {
  let all = [],
    next;
  do {
    const data = await api(
      `${root}/${collection}?pageSize=1000${
        next ? '&pageToken=' + encodeURIComponent(next) : ''
      }`,
    );
    all.push(...(data.documents || []));
    next = data.nextPageToken;
  } while (next);
  return all;
}
function decode(v) {
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  if ('mapValue' in v)
    return Object.fromEntries(
      Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]),
    );
  throw new Error('Unsupported Firestore field type');
}
function encode(v) {
  if (v === null) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  if (typeof v === 'object')
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(v).map(([k, x]) => [k, encode(x)]),
        ),
      },
    };
  if (typeof v === 'number')
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'string') return { stringValue: v };
  throw new Error('Unsupported value ' + String(v));
}
const plain = d =>
  Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, decode(v)]));
const key = v =>
    String(v || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase(),
  vehicle = v =>
    String(v || '')
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase();
const file = path.resolve(__dirname, '../src/utils/loadRecords.js'),
  mod = new Module(file, module);
mod._compile(
  babel.transformFileSync(file, {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code,
  file,
);
const { loadRecords } = mod.exports;
(async () => {
  if (process.argv.includes('--apply')) {
    const folder = process.argv[process.argv.indexOf('--apply') + 1];
    if (!folder) throw new Error('Provide reviewed plan directory');
    const plan = JSON.parse(
      fs.readFileSync(path.join(folder, 'plan.json'), 'utf8'),
    );
    if (plan.email !== email || plan.project !== project)
      throw new Error('Plan target mismatch');
    for (let i = 0; i < plan.writes.length; i += 100)
      await api(root + ':commit', { writes: plan.writes.slice(i, i + 100) });
    for (const name of names) {
      const docs = await list(`workspaces/${plan.uid}/${name}`);
      const expected = plan.writes.filter(w =>
        w.update.name.includes(`/workspaces/${plan.uid}/${name}/`),
      );
      if (docs.length !== expected.length)
        throw new Error(`Count mismatch ${name}`);
      const byName = new Map(docs.map(d => [d.name, d]));
      for (const write of expected) {
        if (
          JSON.stringify(plain(byName.get(write.update.name))) !==
          JSON.stringify(plain(write.update))
        ) {
          const canonical = v =>
            JSON.stringify(v, (_, x) =>
              x &&
              typeof x === 'object' &&
              !Array.isArray(x) &&
              !(x instanceof Date)
                ? Object.fromEntries(
                    Object.entries(x).sort(([a], [b]) => a.localeCompare(b)),
                  )
                : x,
            );
          if (
            canonical(plain(byName.get(write.update.name))) !==
            canonical(plain(write.update))
          )
            throw new Error(`Data mismatch ${write.update.name}`);
        }
      }
      console.log(`${name}: ${docs.length} records verified`);
    }
    fs.writeFileSync(
      path.join(folder, 'verified.json'),
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          uid: plan.uid,
          counts: plan.counts,
        },
        null,
        2,
      ),
    );
    console.log(
      'Recovery verified field-by-field. Original root data untouched.',
    );
    return;
  }
  const accounts = await api(
    `https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:batchGet?maxResults=1000`,
  );
  const account = accounts.users.find(u => u.email === email && !u.disabled);
  if (!account) throw new Error('Exact target account unavailable');
  const uid = account.localId;
  const folder = path.resolve(
    __dirname,
    '../.local-backup/recovery-' +
      new Date().toISOString().replace(/[:.]/g, '-'),
  );
  fs.mkdirSync(folder, { recursive: true });
  const source = {},
    target = {};
  for (const name of names) {
    source[name] = await list(name);
    target[name] = await list(`workspaces/${uid}/${name}`);
    if (target[name].length)
      throw new Error(
        `Destination ${name} contains records. Do not overwrite.`,
      );
  }
  fs.writeFileSync(path.join(folder, 'source.json'), JSON.stringify(source));
  fs.writeFileSync(
    path.join(folder, 'target-before.json'),
    JSON.stringify(target),
  );
  const missing = JSON.parse(
    fs
      .readFileSync(
        path.resolve(
          __dirname,
          '../.local-backup/20260930-144703/preserved-missing-tripEntries.json',
        ),
        'utf8',
      )
      .replace(/^\uFEFF/, ''),
  );
  const missingDocs = Array.isArray(missing) ? missing : [missing];
  for (const item of missingDocs) {
    const doc = item.doc || item;
    if (!doc.name || !doc.fields) throw new Error('Invalid preserved trip');
    if (!source.tripEntries.some(d => d.name === doc.name))
      source.tripEntries.push(doc);
  }
  const data = Object.fromEntries(names.map(name => [name, new Map()]));
  for (const name of ['customers', 'parties'])
    for (const doc of source[name])
      data[name].set(doc.name.split('/').pop(), plain(doc));
  for (const doc of source.drivers) {
    const value = plain(doc);
    data.drivers.set(
      encodeURIComponent(
        String(value.driverName || doc.name.split('/').pop()).toLowerCase(),
      ),
      value,
    );
  }
  for (const doc of source.vehicles) {
    const value = plain(doc);
    data.vehicles.set(vehicle(value.vehicleNo), {
      ...value,
      vehicleNo: vehicle(value.vehicleNo),
      loadCount: 0,
      monthCounts: {},
    });
  }
  for (const doc of source.fromcustomers) {
    const value = plain(doc);
    data.fromcustomers.set(encodeURIComponent(value.from), {
      ...value,
      loadCount: 0,
    });
  }
  for (const [id, value] of data.parties)
    data.parties.set(id, { ...value, loadCount: 0, monthCounts: {} });
  for (const doc of source.tripEntries) {
    const id = doc.name.split('/').pop(),
      trip = plain(doc);
    trip.schemaVersion = 2;
    trip.amountScope = 'trip';
    trip.vehicleKey = vehicle(trip.vehicleNo);
    trip.migratedFrom = doc.name;
    if (!(trip.dateTimestamp instanceof Date))
      throw new Error('Missing trip date ' + id);
    trip.createdAt = trip.createdAt || trip.dateTimestamp;
    trip.locations = trip.locations.map(loc => {
      const partyId = loc.partyId || `party:${encodeURIComponent(key(loc.to))}`;
      return { ...loc, partyId };
    });
    trip.partyIds = [...new Set(trip.locations.map(loc => loc.partyId))];
    trip.partyKeys = [...new Set(trip.locations.map(loc => key(loc.to)))];
    data.tripEntries.set(id, trip);
    const veh = data.vehicles.get(trip.vehicleKey) || {
      vehicleNo: trip.vehicleKey,
      loadCount: 0,
    };
    veh.loadCount++;
    veh.lastTripAt =
      trip.createdAt > (veh.lastTripAt || 0) ? trip.createdAt : veh.lastTripAt;
    data.vehicles.set(trip.vehicleKey, veh);
    for (const { id: loadId, ...load } of loadRecords(id, trip))
      data.loads.set(loadId, load);
    const match = trip.date.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (!match) throw new Error('Unrecognized date ' + id);
    const month = match[3] + '-' + match[2];
    veh.monthCounts = veh.monthCounts || {};
    veh.monthCounts[month] = (veh.monthCounts[month] || 0) + 1;
    for (const loc of trip.locations) {
      const p = data.parties.get(loc.partyId) || {
        to: loc.to,
        partyKey: key(loc.to),
        loadCount: 0,
        monthCounts: {},
      };
      p.loadCount++;
      p.monthCounts[month] = (p.monthCounts[month] || 0) + 1;
      p.lastTripAt =
        trip.createdAt > (p.lastTripAt || 0) ? trip.createdAt : p.lastTripAt;
      data.parties.set(loc.partyId, p);
      const originId = encodeURIComponent(loc.from),
        origin = data.fromcustomers.get(originId) || {
          from: loc.from,
          fromlower: loc.from.toLowerCase(),
          loadCount: 0,
        };
      origin.loadCount++;
      data.fromcustomers.set(originId, origin);
    }
  }
  const profiles = await list('staff');
  fs.writeFileSync(
    path.join(folder, 'staff-before.json'),
    JSON.stringify(profiles),
  );
  const existing = profiles.find(d => d.name.endsWith('/' + uid));
  const writes = [];
  if (!existing)
    writes.push({
      update: {
        name: `projects/${project}/databases/(default)/documents/staff/${uid}`,
        fields: encode({
          email,
          displayName: account.displayName || '92rnamashuk',
          role: 'user',
          active: true,
          createdAt: new Date(),
        }).mapValue.fields,
      },
      currentDocument: { exists: false },
    });
  else if (!plain(existing).active) throw new Error('Target is inactive');
  const counts = {};
  for (const name of names) {
    counts[name] = data[name].size;
    for (const [id, value] of data[name])
      writes.push({
        update: {
          name: `projects/${project}/databases/(default)/documents/workspaces/${uid}/${name}/${id}`,
          fields: encode(value).mapValue.fields,
        },
        currentDocument: { exists: false },
      });
  }
  const plan = { project, email, uid, counts, writes };
  fs.writeFileSync(path.join(folder, 'plan.json'), JSON.stringify(plan));
  console.log(
    JSON.stringify(
      { folder, email, uid, counts, writeCount: writes.length },
      null,
      2,
    ),
  );
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
