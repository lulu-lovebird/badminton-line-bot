import { messagingApi } from '@line/bot-sdk';
import { MatchSession } from '@/types/database';

const { MessagingApiClient } = messagingApi;

export const lineClient = new MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

export { createSessionFlexMessage } from './share-utils';
