import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/components/dashboard/map/restoreWhenStyleReady.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { restoreWhenStyleReady } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
class MapStub extends EventEmitter {
  ready = false;
  isStyleLoaded() { return this.ready; }
}

test('retries after terrain makes the initial load unready and draws once', () => {
  const map = new MapStub();
  let draws = 0;
  map.on('load', () => { map.ready = false; });
  restoreWhenStyleReady(map, () => {
    draws++;
    map.emit('styledata'); // Drawing sources must not recursively restore.
  });
  map.ready = true;
  map.emit('load');
  assert.equal(draws, 0);
  map.emit('styledata');
  assert.equal(draws, 0);
  map.ready = true;
  map.emit('idle');
  map.emit('styledata');
  map.emit('idle');
  assert.equal(draws, 1);
  assert.equal(map.listenerCount('idle'), 0);
});

test('draws immediately if the style is already ready', () => {
  const map = new MapStub();
  map.ready = true;
  let draws = 0;
  restoreWhenStyleReady(map, () => draws++);
  assert.equal(draws, 1);
  assert.equal(map.listenerCount('styledata'), 0);
});

test('discarding or replacing a pending route cancels its restoration', () => {
  const map = new MapStub();
  const draws = [];
  const cancel = restoreWhenStyleReady(map, () => draws.push('old'));
  cancel();
  restoreWhenStyleReady(map, () => draws.push('new'));
  map.ready = true;
  map.emit('styledata');
  assert.deepEqual(draws, ['new']);
});
