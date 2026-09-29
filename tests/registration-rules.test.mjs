import assert from 'node:assert/strict';
import test from 'node:test';
import {
  choosePromotions,
  chooseRegistrationPlacement,
  countPeople,
  isValidPartySize,
  registrationSessionStatus,
} from '../src/lib/registration-rules.ts';

const waiting = (id, party_size, waitlist_order) => ({ id, party_size, waitlist_order });

test('報名人數只接受 1–3 的整數', () => {
  for (const size of [1, 2, 3]) assert.equal(isValidPartySize(size), true);
  for (const size of [-1, 0, 1.5, 4, '2', null, Infinity]) assert.equal(isValidPartySize(size), false);
});

test('備取上限計算人數，不因已遞補的歷史序號鎖住名額', () => {
  const queue = [waiting('second', 1, 2)];
  assert.deepEqual(chooseRegistrationPlacement(8, queue, 1, 8, 2), {
    status: 'waitlist', waitlist_order: 3,
  });
  assert.equal(chooseRegistrationPlacement(8, queue, 2, 8, 2), null);
  assert.equal(chooseRegistrationPlacement(1, [], 3, 2, 3), null);
});

test('已有備取時不讓新報名越過前方多人組', () => {
  assert.deepEqual(chooseRegistrationPlacement(7, [waiting('first', 2, 1)], 1, 8, 3), {
    status: 'waitlist', waitlist_order: 2,
  });
  assert.deepEqual(chooseRegistrationPlacement(7, [], 1, 8, 2), {
    status: 'main', waitlist_order: null,
  });
});

test('正取與備取均按人數計算，歷史負數不可倒扣', () => {
  assert.equal(countPeople([{ party_size: 2 }, { party_size: 3 }]), 5);
  assert.equal(countPeople([{ party_size: -1 }, { party_size: 2 }]), 3);
});

test('嚴格依備取順位整組遞補，不跳過放不下的組', () => {
  const queue = [waiting('family', 2, 1), waiting('single', 1, 2)];
  assert.deepEqual(choosePromotions(queue, 1), []);
  assert.deepEqual(choosePromotions(queue, 2), ['family']);
  assert.deepEqual(choosePromotions(queue, 3), ['family', 'single']);
});

test('正取人數已滿或仍有候補時不顯示為可直接報名', () => {
  assert.equal(registrationSessionStatus(8, 8, 0), 'full');
  assert.equal(registrationSessionStatus(7, 8, 1), 'full');
  assert.equal(registrationSessionStatus(7, 8, 0), 'open');
});
