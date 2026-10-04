type NotificationDetails = {
  action: string;
  groupName: string | null;
  sessionTitle: string;
  startTime: string;
  playerName: string;
  partySize: number;
  progress: string | null;
};

// 呼叫端用既有的 countPeople 規則先統計正取與備取人數。
export function formatHostRegistrationProgress(
  mainCount: number, maxPlayers: number, waitingCount: number, maxWaitlist: number
): string {
  return `正取：${mainCount}/${maxPlayers} 人（空位 ${Math.max(0, maxPlayers - mainCount)} 人）\n備取：${waitingCount}/${maxWaitlist} 人`;
}

export function formatHostNotificationText(details: NotificationDetails): string {
  const groupName = details.groupName?.trim() || '未命名球團';
  const progress = details.progress || '報名進度：暫不可用';
  const time = new Date(details.startTime).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  return `【羽球零打小幫手】${details.action}\n球團：${groupName}\n場次：${details.sessionTitle}\n時間：${time}\n球友：${details.playerName}\n人數：${details.partySize}\n${progress}`;
}

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return entities[character];
});

export function formatHostNotificationHtml(details: NotificationDetails): string {
  const colors = details.action === '取消報名'
    ? { background: '#fff7ed', border: '#fed7aa', foreground: '#9a3412' }
    : details.action === '登記備取'
      ? { background: '#fffbeb', border: '#fde68a', foreground: '#92400e' }
      : { background: '#ecfdf5', border: '#a7f3d0', foreground: '#065f46' };
  const groupName = escapeHtml(details.groupName?.trim() || '未命名球團');
  const time = escapeHtml(new Date(details.startTime).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }));
  const progress = escapeHtml(details.progress || '報名進度：暫不可用').replace(/\n/g, '<br>');
  const row = (label: string, value: string) =>
    `<tr><th scope="row" style="padding:9px 0;text-align:left;vertical-align:top;color:#64748b;font-size:13px;font-weight:400;width:64px">${label}</th><td style="padding:9px 0;color:#0f172a;font-size:15px;line-height:1.6;word-break:break-word">${value}</td></tr>`;

  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f8fafc;font-family:Arial,'Noto Sans TC',sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
<div style="padding:24px;background:${colors.background};border-bottom:1px solid ${colors.border}">
<p style="margin:0 0 8px;color:${colors.foreground};font-size:13px;font-weight:bold">羽球零打小幫手・團主通知</p>
<h1 style="margin:0;color:${colors.foreground};font-size:22px;line-height:1.4">${escapeHtml(details.action)}</h1>
</div>
<div style="padding:16px 24px 24px">
<table role="presentation" style="width:100%;border-collapse:collapse">
${row('球團', groupName)}
${row('場次', escapeHtml(details.sessionTitle))}
${row('時間', time)}
${row('球友', escapeHtml(details.playerName))}
${row('人數', escapeHtml(String(details.partySize)))}
</table>
<div style="margin-top:16px;padding:16px;background:#f1f5f9;border-radius:8px;color:#334155;font-size:14px;line-height:1.8">
<strong style="color:#0f172a">目前報名進度</strong><br>${progress}
</div>
</div></div>
<p style="max-width:560px;margin:16px auto 0;text-align:center;font-size:12px;color:#64748b">此信僅寄送給本場次的原始主揪。<br>Developed with ❤️ by Bean, Bird &amp; Badminton Tech Consulting</p>
</body></html>`;
}
