import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const source = await readFile(new URL('../src/models/SavedRoute.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
 .replace(/import \{ Schema, model, models \} from \"mongoose\";/, `import mongoose from ${JSON.stringify(pathToFileURL(require.resolve('mongoose')).href)}; const { Schema, model, models } = mongoose;`);
const { default: SavedRoute } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const route = { userId: 'navigation-test', from: { lat: 40, lng: -73 }, to: { lat: 40.01, lng: -73.01 }, difficulty: 'easy', coords: [[-73,40],[-73.01,40.01]] };
const step = { index: 0, instruction: 'Turn right onto the walkway.', distance: 100, duration: 80, location: [-73,40], maneuver: { lng:-73,lat:40,type:'turn',modifier:'right' }, terrainHint:'Gentle downhill ahead.', spokenAdvance:false, spokenFinal:false, completed:false };

test('saved-route schema preserves instructions and maneuver data on round trip', () => {
 const saved = new SavedRoute({ ...route, navSteps: [step] });
 assert.equal(saved.validateSync(), undefined);
 const reloaded = new SavedRoute(JSON.parse(JSON.stringify(saved.toObject())));
 assert.deepEqual(reloaded.toObject().navSteps, [step]);
});
test('older records without steps remain readable for the rebuilding flow', () => {
 const old = new SavedRoute(route);
 assert.equal(old.validateSync(), undefined);
 assert.deepEqual(old.toObject().navSteps, []);
});
test('incomplete instructions cannot silently persist as valid navigation', () => {
 const invalid = new SavedRoute({ ...route, navSteps: [{ index: 0 }] });
 assert.ok(invalid.validateSync());
});

test('a cached pre-update model gains navigation persistence without a restart', async () => {
 const mongoose = require('mongoose');
 mongoose.deleteModel('SavedRoute');
 const legacy = mongoose.model('SavedRoute', new mongoose.Schema({
  userId: String, from: Object, to: Object, difficulty: String, coords: [[Number]],
 }));
 assert.equal(legacy.schema.path('navSteps'), undefined);
 const refreshed = await import(`data:text/javascript;base64,${Buffer.from(compiled + '\n// hot reload').toString('base64')}`);
 const saved = new refreshed.default({ ...route, navSteps: [step] });
 assert.equal(saved.validateSync(), undefined);
 assert.deepEqual(saved.toObject().navSteps, [step]);
});
