import { messagingApi } from '@line/bot-sdk';
import { MatchSession } from '@/types/database';

const { MessagingApiClient } = messagingApi;

export const lineClient = new MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

/**
 * 產生美觀的零打場次 LINE Flex Message 卡片
 */
export function createSessionFlexMessage(session: MatchSession, liffBaseUrl: string) {
  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);

  // 格式化日期與星期
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const month = startDate.getMonth() + 1;
  const day = startDate.getDate();
  const dayOfWeek = days[startDate.getDay()];
  const startHours = startDate.getHours().toString().padStart(2, '0');
  const startMins = startDate.getMinutes().toString().padStart(2, '0');
  const endHours = endDate.getHours().toString().padStart(2, '0');
  const endMins = endDate.getMinutes().toString().padStart(2, '0');

  const timeStr = `${month}/${day} (${dayOfWeek}) ${startHours}:${startMins} - ${endHours}:${endMins}`;
  const matchTypeStr = session.match_type === 'single' ? '單打' : '雙打';

  const isFull = session.status === 'full';
  const headerColor = isFull ? '#1B5E20' : '#2E7D32'; // 深綠/淺綠
  const statusBadge = isFull ? '額滿 (可備取)' : '熱烈招募中';

  const registerUrl = `${liffBaseUrl}?action=register&sessionId=${session.id}`;

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
