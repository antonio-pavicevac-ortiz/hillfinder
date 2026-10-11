import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/map/clearRouteLayers.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { clearRouteLayers } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('removes all previous segments during source updates, including leftover high indexes', () => {
 const layers = new Set(['road', ...Array.from({ length: 75 }, (_, i) => `route-segment-${i}`)]);
 const sources = new Set(layers);
 const map = {
  isStyleLoaded: () => false,
  once: () => assert.fail('Cleanup must not wait for another initial map load'),
  getStyle: () => ({ layers: [...layers].map(id => ({ id })) }),
  getLayer: id => layers.has(id),
  removeLayer: id => layers.delete(id),
  getSource: id => sources.has(id),
  removeSource: id => { assert.equal(layers.has(id), false); sources.delete(id); },
 };
 clearRouteLayers(map);
 assert.deepEqual([...layers], ['road']);
 assert.deepEqual([...sources], ['road']);
});

test('cleanup before style initialization safely does nothing', () => {
 clearRouteLayers({ getStyle: () => undefined });
});

test('handles Mapbox throwing while its style is still initializing', () => {
 const map = {
  getStyle: () => { throw new Error('Style is not done loading'); },
  removeLayer: () => assert.fail('An initializing style must not be mutated'),
  removeSource: () => assert.fail('An initializing style must not be mutated'),
 };
 assert.doesNotThrow(() => clearRouteLayers(map));
});
