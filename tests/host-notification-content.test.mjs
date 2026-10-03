import assert from 'node:assert/strict';
import test from 'node:test';
import { formatHostNotificationText, formatHostRegistrationProgress } from '../src/lib/host-notification-content.ts';
import { countPeople } from '../src/lib/registration-rules.ts';

test('正取進度按人數計算：2/8 表示剩餘 6 個空位', () => {
  const registrations = [
    { party_size: 2, status: 'main' },
    { party_size: 1, status: 'cancelled' },
  ];
  const progress = formatHostRegistrationProgress(
    countPeople(registrations.filter((registration) => registration.status === 'main')), 8,
    countPeople(registrations.filter((registration) => registration.status === 'waitlist')), 2
  );
  assert.equal(progress, '正取：2/8 人（空位 6 人）\n備取：0/2 人');
});

test('備取與多人同行按人數計算，已取消者不列入進度', () => {
  const registrations = [
    { party_size: -1, status: 'main' },
    { party_size: 2, status: 'waitlist' },
    { party_size: 1, status: 'cancelled' },
  ];
  const progress = formatHostRegistrationProgress(
    countPeople(registrations.filter((registration) => registration.status === 'main')), 8,
    countPeople(registrations.filter((registration) => registration.status === 'waitlist')), 3
  );
  assert.equal(progress, '正取：1/8 人（空位 7 人）\n備取：2/3 人');
});

test('報名與取消通知均有球團名稱和進度', () => {
  const details = {
    groupName: '測試羽球團', sessionTitle: '週四零打', startTime: '2026-10-08T04:30:00Z',
    playerName: '測試球友', partySize: 1, progress: '正取：2/8 人（空位 6 人）\n備取：0/2 人',
  };
  for (const action of ['報名正取', '取消報名']) {
    const text = formatHostNotificationText({ ...details, action });
    assert.match(text, new RegExp(`【羽球零打小幫手】${action}`));
    assert.match(text, /球團：測試羽球團/);
    assert.match(text, /正取：2\/8 人（空位 6 人）/);
  }
});

test('球團名稱或統計暫時缺失時，保留原本的通知內容', () => {
  const text = formatHostNotificationText({
    action: '登記備取', groupName: ' ', sessionTitle: '週四零打', startTime: '2026-10-08T04:30:00Z',
    playerName: '測試球友', partySize: 1, progress: null,
  });
  assert.match(text, /球團：未命名球團/);
  assert.match(text, /報名進度：暫不可用/);
  assert.match(text, /球友：測試球友/);
});
