import cron from 'node-cron';
import { fetchNewToken, storeToken } from './tokenManager';

// Run every 24 hours at midnight
export function startTokenRefreshScheduler() {
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Refreshing Shopify token...');
    try {
      const { accessToken, expiresAt } = await fetchNewToken();
      await storeToken(accessToken, expiresAt);
      console.log('[CRON] Token refreshed successfully, expires at', expiresAt);
    } catch (error) {
      console.error('[CRON] Token refresh failed:', error);
    }
  });
  console.log('[CRON] Token refresh scheduler started (daily at midnight)');
}