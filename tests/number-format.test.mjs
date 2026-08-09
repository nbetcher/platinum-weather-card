import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sourcePath = fileURLToPath(new URL('../src/number-format.ts', import.meta.url));
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const numbers = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('rejects empty and non-finite Home Assistant states', () => {
  for (const value of [undefined, null, '', '  ', 'unknown', 'unavailable', Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(numbers.toFiniteNumber(value), undefined);
    assert.equal(numbers.formatFiniteNumber(value, 'en-US'), '---');
  }
});

test('preserves zero and formats finite values with requested precision', () => {
  assert.equal(numbers.formatFiniteNumber('0', 'en-US'), '0');
  assert.equal(numbers.formatFiniteNumber('12.34', 'en-US', 1), '12.3');
  assert.equal(numbers.formatFiniteNumber('12.35', 'en-US', 1), '12.4');
  assert.equal(numbers.formatFiniteNumber('invalid', 'en-US', 0, 0, ''), '');
});
