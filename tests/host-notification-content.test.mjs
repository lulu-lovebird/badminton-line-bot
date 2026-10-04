import assert from 'node:assert/strict';
import test from 'node:test';
import { formatHostNotificationHtml, formatHostNotificationText, formatHostRegistrationProgress } from '../src/lib/host-notification-content.ts';
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
  const details = {
    action: '登記備取', groupName: ' ', sessionTitle: '週四零打', startTime: '2026-10-08T04:30:00Z',
    playerName: '測試球友', partySize: 1, progress: null,
  };
  const text = formatHostNotificationText(details);
  const html = formatHostNotificationHtml(details);
  assert.match(text, /球團：未命名球團/);
  assert.match(text, /報名進度：暫不可用/);
  assert.match(text, /球友：測試球友/);
  assert.match(html, /未命名球團/);
  assert.match(html, /報名進度：暫不可用/);
});

test('正取淺綠、備取淺黃、取消淺橘，且都有文字狀態', () => {
  const details = {
    groupName: '測試羽球團', sessionTitle: '週四零打', startTime: '2026-10-08T04:30:00Z',
    playerName: '測試球友', partySize: 2, progress: '正取：2/8 人（空位 6 人）\n備取：0/2 人',
  };
  for (const [action, color] of [['報名正取', '#ecfdf5'], ['登記備取', '#fffbeb'], ['取消報名', '#fff7ed']]) {
    const html = formatHostNotificationHtml({ ...details, action });
    assert.match(html, new RegExp(`<h1[^>]*>${action}</h1>`));
    assert.ok(html.includes(`background:${color}`));
    assert.match(html, /球友<\/th><td[^>]*>測試球友<\/td>/);
    assert.match(html, /正取：2\/8 人（空位 6 人）<br>備取：0\/2 人/);
    assert.doesNotMatch(html, /<img\b|<link\b/i);
  }
});

test('所有使用者可輸入欄位須做 HTML 跳脫', () => {
  const html = formatHostNotificationHtml({
    action: '報名正取', groupName: '<script>bad()</script>', sessionTitle: '週四 <b>場',
    startTime: '2026-10-08T04:30:00Z', playerName: 'A&B "球友"', partySize: 1,
    progress: '正取：<1/8 人（空位 7 人）\n備取：0/2 人',
  });
  assert.doesNotMatch(html, /<script>|<b>場/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.match(html, /週四 &lt;b&gt;場/);
  assert.match(html, /A&amp;B &quot;球友&quot;/);
  assert.match(html, /正取：&lt;1\/8 人/);
});
