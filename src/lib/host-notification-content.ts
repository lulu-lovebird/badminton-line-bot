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
