import fs from 'fs';
import path from 'path';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient, MessagingApiBlobClient } = messagingApi;

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const liffUrl = process.env.LINE_LIFF_URL || process.env.NEXT_PUBLIC_LIFF_URL || '';

if (!channelAccessToken) {
  console.error('❌ 請先在環境變數中設定 LINE_CHANNEL_ACCESS_TOKEN');
  process.exit(1);
}

if (!liffUrl) {
  console.error('❌ 請先在環境變數中設定 LINE_LIFF_URL (或 NEXT_PUBLIC_LIFF_URL)');
  process.exit(1);
}

const client = new MessagingApiClient({ channelAccessToken });
const blobClient = new MessagingApiBlobClient({ channelAccessToken });

async function setupRichMenu() {
  try {
    console.log('🏸 正在建立羽球小幫手圖文選單 (Rich Menu)...');

    // 1. 定義 3 格選單架構 (2500 x 843)
    const richMenuObject = {
      size: { width: 2500, height: 843 },
      selected: true,
      name: '羽球零打小幫手主要選單',
      chatBarText: '🏸 點我開啟零打選單',
      areas: [
        // 按鈕 1: 我要報名 (0, 0) ~ (833, 843)
        {
          bounds: { x: 0, y: 0, width: 833, height: 843 },
          action: {
            type: 'uri' as const,
            label: '我要報名',
            uri: `${liffUrl}/sessions`,
          },
        },
        // 按鈕 2: 報名記錄 (833, 0) ~ (834, 843)
        {
          bounds: { x: 833, y: 0, width: 834, height: 843 },
          action: {
            type: 'uri' as const,
            label: '報名記錄',
            uri: `${liffUrl}/my-records`,
          },
        },
        // 按鈕 3: 團主後台 (1667, 0) ~ (833, 843)
        {
          bounds: { x: 1667, y: 0, width: 833, height: 843 },
          action: {
            type: 'uri' as const,
            label: '團主後台',
            uri: `${liffUrl}/admin`,
          },
        },
      ],
    };

    // 2. 呼叫 LINE API 建立選單
    const createRes = await client.createRichMenu(richMenuObject);
    const richMenuId = createRes.richMenuId;
    console.log(`✅ 圖文選單建立成功！RichMenu ID: ${richMenuId}`);

    // 3. 上傳圖片
    const imagePath = path.join(process.cwd(), 'public', 'images', 'richmenu.png');
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const blob = new Blob([imageBuffer], { type: 'image/png' });
      await blobClient.setRichMenuImage(richMenuId, blob);
      console.log('✅ 圖文選單底圖上傳成功！');
    }

    // 4. 設定為所有人的預設選單
    await client.setDefaultRichMenu(richMenuId);
    console.log('🎉 已成功將此圖文選單設為全域預設選單！');
  } catch (err: unknown) {
    console.error('❌ 設定圖文選單失敗:', err);
  }
}

setupRichMenu();
