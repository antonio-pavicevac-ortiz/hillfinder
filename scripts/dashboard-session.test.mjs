import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/session/dashboardSession.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { saveDashboardSession, loadDashboardSession, clearDashboardSession, savedRouteExists, sessionPayloadToRecord } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const payload = { from: { lat: 40, lng: -73 }, to: { lat: 41, lng: -74 }, difficulty: 'easy', coords: [[-73, 40], [-74, 41]] };
const session = { fromLocation: payload.from, destination: payload.to, selectedVariant: 'easy', activeRouteSource: 'generated', routePayload: payload };

function mockStorage(t) {
  const values = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  } });
}

test('saved route survives refresh and is verified by its real ID', async (t) => {
  mockStorage(t);
  saveDashboardSession({ ...session, savedRouteId: 'real-route-id' });
  const restored = loadDashboardSession();
  assert.equal(restored.savedRouteId, 'real-route-id');
  assert.deepEqual(restored.routePayload, payload);
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/routes?id=real-route-id');
    assert.equal(options.cache, 'no-store');
    return new Response(JSON.stringify({ route: { _id: 'real-route-id' } }));
  });
  assert.equal(await savedRouteExists(restored.savedRouteId), true);
});

test('deleted saved record leaves the map payload restorable but permits resaving', async (t) => {
  mockStorage(t);
  saveDashboardSession({ ...session, savedRouteId: 'deleted-id' });
  const restored = loadDashboardSession();
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 404 }));
  assert.equal(await savedRouteExists(restored.savedRouteId), false);
  saveDashboardSession({ ...restored, savedRouteId: null });
  assert.equal(loadDashboardSession().savedRouteId, null);
  assert.deepEqual(loadDashboardSession().routePayload.coords, payload.coords);
});

test('unsaved and legacy sessions do not gain saved status from the map record', (t) => {
  mockStorage(t);
  saveDashboardSession(session);
  assert.equal(loadDashboardSession().savedRouteId, undefined);
  assert.equal(sessionPayloadToRecord(loadDashboardSession().routePayload)._id, 'session-restore');
});

test('clearing the route prevents restoration after refresh', (t) => {
  mockStorage(t);
  saveDashboardSession({ ...session, savedRouteId: 'real-route-id' });
  clearDashboardSession();
  assert.equal(loadDashboardSession(), null);
});

test('server failures cannot be mistaken for deletion', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 500 }));
  await assert.rejects(savedRouteExists('real-route-id'), /Could not verify/);
});

test('verification supports cancellation and rejects a mismatched saved ID', async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.signal, controller.signal);
    return new Response(JSON.stringify({ route: { _id: 'different-id' } }));
  });
  assert.equal(await savedRouteExists('real-route-id', controller.signal), false);
});
