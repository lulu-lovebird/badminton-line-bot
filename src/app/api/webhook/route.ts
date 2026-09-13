import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { lineClient, createSessionFlexMessage } from '@/lib/line';
import { supabaseAdmin } from '@/lib/supabase';
import { isSuperAdmin } from '@/lib/auth';

function verifySignature(body: string, signature: string, secret: string) {
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get('x-line-signature') || '';
  const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

  if (channelSecret && !verifySignature(bodyText, signature, channelSecret)) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
  }

  const data = JSON.parse(bodyText);
  const events = data.events || [];

  for (const event of events) {
    const liffBaseUrl = process.env.NEXT_PUBLIC_LIFF_URL || process.env.LINE_LIFF_URL || 'https://liff.line.me/your-liff-id';

    // 1. 處理機器人被邀請加入群組
    if (event.type === 'join') {
      const groupId = event.source.groupId || event.source.roomId;
      if (groupId) {
        let groupName = '羽球社團群組';
        try {
          const summary = await lineClient.getGroupSummary(groupId);
          if (summary?.groupName) groupName = summary.groupName;
        } catch {}

        await supabaseAdmin.from('groups').upsert({
          group_id: groupId,
          group_name: groupName,
          is_active: true,
        });

        const welcomeLiffUrl = `${liffBaseUrl}?groupId=${groupId}`;

        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [
            {
              type: 'flex',
              altText: '🏸 零打小幫手已加入群組！',
              contents: {
                type: 'bubble',
                header: {
                  type: 'box',
                  layout: 'vertical',
                  backgroundColor: '#16A34A',
                  contents: [
                    {
                      type: 'text',
                      text: `🏸 零打小幫手報到！`,
                      weight: 'bold',
                      color: '#FFFFFF',
                      size: 'md',
                    },
                  ],
                },
                body: {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: `大家好！我是【${groupName}】的零打報名小幫手。`,
                      size: 'xs',
                      color: '#333333',
                    },
                    {
                      type: 'text',
                      text: '• 團主開場請進入後台建立場次\n• 球友點擊置頂公告或輸入「我要報名」即可登記！',
                      size: 'xs',
                      color: '#666666',
                      wrap: true,
                    },
                  ],
                },
                footer: {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'button',
                      style: 'primary',
                      color: '#16A34A',
                      height: 'sm',
                      action: {
                        type: 'uri',
                        label: '👉 查看本群零打場次',
                        uri: welcomeLiffUrl,
                      },
                    },
                  ],
                },
              },
            },
          ],
        });
      }
    }

    // 2. 處理文字訊息
    if (event.type === 'message' && event.message.type === 'text') {
      const userText = event.message.text.trim();
      const replyToken = event.replyToken;
      const isGroup = event.source.type === 'group' || event.source.type === 'room';
      const groupId = isGroup ? (event.source.groupId || event.source.roomId) : null;
      const senderUserId = event.source.userId;

      // 🔍 專屬查詢指令：我的ID / 我的id / whoami
      if (userText === '我的id' || userText === '我的ID' || userText.toLowerCase() === 'whoami') {
        await lineClient.replyMessage({
          replyToken,
          messages: [
            {
              type: 'text',
              text: `🔑 您的 LINE User ID 為：\n${senderUserId}\n\n(請複製此 ID 填入 Vercel 的 SUPER_ADMIN_LINE_IDS 環境變數)`,
            },
          ],
        });
        continue;
      }

      // 檢查群組停權
      if (groupId) {
        const { data: grp } = await supabaseAdmin
          .from('groups')
          .select('is_active')
          .eq('group_id', groupId)
          .single();

        if (grp && !grp.is_active) {
          if (userText === '零打' || userText === '我要報名' || userText === '開團') {
            await lineClient.replyMessage({
              replyToken,
              messages: [{ type: 'text', text: '⚠️ 此群組的零打小幫手服務已被系統管理員暫停。' }],
            });
          }
          continue;
        }
      }

      // 關鍵字：admin / 管理員 / !admin / 超級管理 (提供 Super Admin 專屬一鍵開啟後台)
      const adminKeywords = ['admin', '管理員', '!admin', '超級管理', 'superadmin'];
      if (adminKeywords.includes(userText.toLowerCase())) {
        let isSenderSuperAdmin = senderUserId ? isSuperAdmin(senderUserId) : false;
        if (!isSenderSuperAdmin && senderUserId) {
          const { data: dbUser } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('line_user_id', senderUserId)
            .maybeSingle();
          if (dbUser?.role === 'admin') isSenderSuperAdmin = true;
        }

        if (isSenderSuperAdmin) {
          const superAdminUrl = `${liffBaseUrl.replace(/\/+$/, '')}/super-admin`;
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: 'flex',
                altText: '👑 系統最高管理後台快捷入口',
                contents: {
                  type: 'bubble',
                  size: 'kilo',
                  header: {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: '#4C1D95',
                    paddingAll: '14px',
                    contents: [
                      {
                        type: 'text',
                        text: '👑 系統最高管理後台',
                        weight: 'bold',
                        color: '#FFFFFF',
                        size: 'md',
                      },
                    ],
                  },
                  body: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: '14px',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'text',
                        text: '✨ 管理員身分已驗證通過',
                        size: 'xs',
                        weight: 'bold',
                        color: '#6D28D9',
                      },
                      {
                        type: 'text',
                        text: '點擊下方按鈕直接進入全域管理後台，可進行群組授權開通與團主身分審核。',
                        size: 'xxs',
                        color: '#666666',
                        wrap: true,
                      },
                      {
                        type: 'button',
                        style: 'primary',
                        color: '#6D28D9',
                        height: 'sm',
                        margin: 'md',
                        action: {
                          type: 'uri',
                          label: '👉 開啟最高管理後台',
                          uri: superAdminUrl,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          });
          continue;
        }
      }

      // 關鍵字：零打 / 我要報名 / 開團
      if (userText === '零打' || userText === '我要報名' || userText === '開團') {
        const groupParam = groupId ? `?groupId=${groupId}` : '';
        const liffUrl = `${liffBaseUrl}${groupParam}`;

        if (isGroup) {
          await lineClient.replyMessage({
            replyToken,
            messages: [
              {
                type: 'flex',
                altText: '🏸 查看開放零打場次與報名',
                contents: {
                  type: 'bubble',
                  size: 'kilo',
                  body: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: '12px',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'text',
                        text: '🏸 本群零打場次查詢與報名',
                        weight: 'bold',
                        size: 'sm',
                        color: '#166534',
                      },
                      {
                        type: 'text',
                        text: '點擊下方按鈕即可開啟本群場次與即時報名！',
                        size: 'xxs',
                        color: '#666666',
                        wrap: true,
                      },
                      {
                        type: 'button',
                        style: 'primary',
                        color: '#16A34A',
                        height: 'sm',
                        action: {
                          type: 'uri',
                          label: '👉 開啟本群零打場次',
                          uri: liffUrl,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          });
        } else {
          const now = new Date().toISOString();
          const { data: sessions } = await supabaseAdmin
            .from('match_sessions')
            .select('*')
            .gte('start_time', now)
            .in('status', ['open', 'full'])
            .order('start_time', { ascending: true })
            .limit(5);

          if (!sessions || sessions.length === 0) {
            await lineClient.replyMessage({
              replyToken,
              messages: [{ type: 'text', text: '目前暫無開放中的零打場次，請靜待各團團主開團！🏸' }],
            });
          } else {
            const hostUserIds = Array.from(new Set(sessions.map((s) => s.host_user_id).filter(Boolean)));
            const { data: hostUsers } = await supabaseAdmin
              .from('users')
              .select('line_user_id, display_name')
              .in('line_user_id', hostUserIds);
            const hostMap = new Map((hostUsers || []).map((u) => [u.line_user_id, u.display_name]));

            const sessionsWithHost = sessions.map((s) => ({
              ...s,
              host_name: hostMap.get(s.host_user_id) || '球團主揪',
            }));

            const flexBubbles = sessionsWithHost.map((s) => createSessionFlexMessage(s, liffBaseUrl).contents);
            await lineClient.replyMessage({
              replyToken,
              messages: [
                {
                  type: 'flex',
                  altText: '🏸 近期開放零打場次清單',
                  contents: {
                    type: 'carousel',
                    contents: flexBubbles,
                  },
                },
              ],
            });
          }
        }
      }
    }
  }

  return NextResponse.json({ status: 'ok' });
}
