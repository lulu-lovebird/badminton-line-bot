import assert from 'node:assert/strict';
import test from 'node:test';
import { finalizeEffectiveCancellation } from '../src/lib/cancellation-finalization.ts';

test('遞補成功後通知團主', async () => {
  const steps = [];
  await finalizeEffectiveCancellation(
    async () => { steps.push('reconcile'); },
    async () => { steps.push('notify'); }
  );
  assert.deepEqual(steps, ['reconcile', 'notify']);
});

test('取消已生效但遞補失敗時仍通知團主，並保留原錯誤', async () => {
  const steps = [];
  const failure = new Error('遞補失敗');
  await assert.rejects(finalizeEffectiveCancellation(
    async () => { steps.push('reconcile'); throw failure; },
    async () => { steps.push('notify'); }
  ), (error) => error === failure);
  assert.deepEqual(steps, ['reconcile', 'notify']);
});

test('團主通知失敗不回滾已生效的取消', async () => {
  const originalWarn = console.warn;
  const warnings = [];
  try {
    console.warn = (...messages) => warnings.push(messages[0]);
    await finalizeEffectiveCancellation(
      async () => {},
      async () => { throw new Error('寄送失敗'); }
    );
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.length, 1);
});
