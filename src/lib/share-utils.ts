import { MatchSession } from '@/types/database';

/**
 * 格式化台北時區時間
 */
export function formatTaipeiDate(dateString: string) {
  const date = new Date(dateString);
  const formatter = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return {
    month: get('month'),
    day: get('day'),
    weekday: get('weekday').replace(/週|星期/, ''),
    hours: get('hour') === '24' ? '00' : get('hour'),
    mins: get('minute'),
  };
}

/**
 * 取得報名頁面專屬 LIFF 連結
 */
export function getSessionLiffUrl(sessionId: string, liffBaseUrl?: string): string {
  const base = liffBaseUrl || process.env.NEXT_PUBLIC_LIFF_URL || 'https://liff.line.me/2011571193-7TCyhgGU';
  const cleanBase = base.replace(/\/$/, '');
  return `${cleanBase}/sessions?sessionId=${sessionId}`;
}

/**
 * 產生開團排版文案（供團主一鍵複製至 LINE 群組）
 */
export function formatSessionAnnouncement(session: MatchSession, liffBaseUrl?: string): string {
  const s = formatTaipeiDate(session.start_time);
  const e = formatTaipeiDate(session.end_time);
  const timeStr = `${s.month}/${s.day} (${s.weekday}) ${s.hours}:${s.mins} - ${e.hours}:${e.mins}`;
  const matchTypeStr = session.match_type === 'single' ? '單打' : session.match_type === 'any' ? '不限' : '雙打';
  const registerUrl = getSessionLiffUrl(session.id, liffBaseUrl);

  const lines = [
    `🏸 【${matchTypeStr}零打】${session.title}`,
    `📅 時間：${timeStr}`,
    `📍 地點：${session.location}${session.court_info ? ` (${session.court_info})` : ''}`,
    `👥 人數：正取 ${session.max_players} 人 / 備取 ${session.max_waitlist} 人`,
    `💰 費用：$${session.fee} / 人`,
    session.shuttlecock ? `🏸 用球：${session.shuttlecock}` : null,
    session.level_requirement ? `⭐ 程度：${session.level_requirement}` : null,
    session.notes ? `ℹ️ 備註：${session.notes}` : null,
    ``,
    `👉 點擊連結立即卡位報名：`,
    registerUrl,
  ].filter((line) => line !== null);

  return lines.join('\n');
}

/**
 * 產生純前端/跨環境可用的 LINE Flex Message 物件 (供 liff.shareTargetPicker 使用)
 */
export function createSessionFlexMessage(session: MatchSession, liffBaseUrl?: string) {
  const s = formatTaipeiDate(session.start_time);
  const e = formatTaipeiDate(session.end_time);
  const timeStr = `${s.month}/${s.day} (${s.weekday}) ${s.hours}:${s.mins} - ${e.hours}:${e.mins}`;
  const matchTypeStr = session.match_type === 'single' ? '單打' : session.match_type === 'any' ? '不限' : '雙打';

  const isFull = session.status === 'full';
  const headerColor = isFull ? '#1B5E20' : '#2E7D32';
  const statusBadge = isFull ? '額滿 (可備取)' : '熱烈招募中';

  const registerUrl = getSessionLiffUrl(session.id, liffBaseUrl);

  return {
    type: 'flex' as const,
    altText: `🏸 羽球開團囉！${timeStr} @ ${session.location}`,
    contents: {
      type: 'bubble' as const,
      header: {
        type: 'box' as const,
        layout: 'vertical' as const,
        backgroundColor: headerColor,
        paddingAll: '16px',
        contents: [
          {
            type: 'text' as const,
            text: `🏸 【${matchTypeStr}零打】${session.title}`,
            weight: 'bold' as const,
            color: '#FFFFFF',
            size: 'lg' as const,
            wrap: true,
          },
          {
            type: 'text' as const,
            text: statusBadge,
            color: '#A5D6A7',
            size: 'sm' as const,
            margin: 'sm' as const,
            weight: 'bold' as const,
          },
        ],
      },
      body: {
        type: 'box' as const,
        layout: 'vertical' as const,
        spacing: 'md' as const,
        contents: [
          {
            type: 'box' as const,
            layout: 'horizontal' as const,
            contents: [
              { type: 'text' as const, text: '📅 時間', color: '#888888', size: 'sm' as const, flex: 2 },
              { type: 'text' as const, text: timeStr, color: '#333333', size: 'sm' as const, weight: 'bold' as const, flex: 5, wrap: true },
            ],
          },
          {
            type: 'box' as const,
            layout: 'horizontal' as const,
            contents: [
              { type: 'text' as const, text: '👤 主揪', color: '#888888', size: 'sm' as const, flex: 2 },
              { type: 'text' as const, text: session.host_name || '球團團主', color: '#1B5E20', size: 'sm' as const, weight: 'bold' as const, flex: 5 },
            ],
          },
          {
            type: 'box' as const,
            layout: 'horizontal' as const,
            contents: [
              { type: 'text' as const, text: '📍 地點', color: '#888888', size: 'sm' as const, flex: 2 },
              { type: 'text' as const, text: `${session.location} ${session.court_info || ''}`, color: '#333333', size: 'sm' as const, flex: 5, wrap: true },
            ],
          },
          {
            type: 'box' as const,
            layout: 'horizontal' as const,
            contents: [
              { type: 'text' as const, text: '👥 人數', color: '#888888', size: 'sm' as const, flex: 2 },
              { type: 'text' as const, text: `正取上限 ${session.max_players} 人 (備取 ${session.max_waitlist} 人)`, color: '#333333', size: 'sm' as const, flex: 5 },
            ],
          },
          {
            type: 'box' as const,
            layout: 'horizontal' as const,
            contents: [
              { type: 'text' as const, text: '💰 費用', color: '#888888', size: 'sm' as const, flex: 2 },
              { type: 'text' as const, text: `$${session.fee} / 人`, color: '#E65100', size: 'sm' as const, weight: 'bold' as const, flex: 5 },
            ],
          },
          {
            type: 'box' as const,
            layout: 'horizontal' as const,
            contents: [
              { type: 'text' as const, text: '🏸 用球', color: '#888888', size: 'sm' as const, flex: 2 },
              { type: 'text' as const, text: session.shuttlecock || '球團提供', color: '#333333', size: 'sm' as const, flex: 5 },
            ],
          },
          {
            type: 'box' as const,
            layout: 'horizontal' as const,
            contents: [
              { type: 'text' as const, text: '⭐ 程度', color: '#888888', size: 'sm' as const, flex: 2 },
              { type: 'text' as const, text: session.level_requirement || '不限', color: '#333333', size: 'sm' as const, flex: 5 },
            ],
          },
          ...(session.notes
            ? [
                {
                  type: 'text' as const,
                  text: `ℹ️ 備註：${session.notes}`,
                  size: 'xs' as const,
                  color: '#666666',
                  wrap: true,
                },
              ]
            : []),
        ],
      },
      footer: {
        type: 'box' as const,
        layout: 'vertical' as const,
        spacing: 'sm' as const,
        contents: [
          {
            type: 'button' as const,
            style: 'primary' as const,
            color: '#16A34A',
            action: {
              type: 'uri' as const,
              label: isFull ? '我要備取' : '立即報名',
              uri: registerUrl,
            },
          },
        ],
      },
    },
  };
}

/**
 * 透過 LIFF shareTargetPicker 分享給 LINE 好友或群組 (0 額度消耗)
 */
export async function shareSessionViaTargetPicker(liff: any, session: MatchSession, liffBaseUrl?: string): Promise<{ ok: boolean; message: string }> {
  if (!liff) {
    return { ok: false, message: 'LIFF 尚未初始化，請重新整理頁面' };
  }
  if (!liff.isLoggedIn()) {
    return { ok: false, message: '請先在 LINE 中登入' };
  }
  if (!liff.isApiAvailable('shareTargetPicker')) {
    return {
      ok: false,
      message: '您的 LINE 環境尚未啟用社群分享器。\n\n💡 請至 LINE Developers Console -> LIFF 分頁，將該 LIFF App 的「Share Target Picker」開關切換為【ON】啟用。\n\n目前您可以直接點擊下方「複製報名連結」或「複製開團文案」貼至群組！',
    };
  }

  try {
    const flexMsg = createSessionFlexMessage(session, liffBaseUrl);
    const res = await liff.shareTargetPicker([flexMsg]);
    if (res) {
      return { ok: true, message: '🎉 已成功以個人身份分享開團卡片至群組！(0 Bot 額度消耗)' };
    } else {
      return { ok: false, message: '已取消分享' };
    }
  } catch (err: any) {
    console.error('shareTargetPicker error:', err);
    return { ok: false, message: err?.message || '分享失敗，請改用複製連結' };
  }
}
