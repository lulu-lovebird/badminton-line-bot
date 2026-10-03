// 取消狀態已寫入資料庫後，即使候補遞補失敗也必須觸發取消通知。
// 通知屬於 best-effort，不可覆蓋遞補錯誤或把已生效的取消當成失敗回滾。
export async function finalizeEffectiveCancellation(
  reconcileWaitlist: () => Promise<void>,
  notifyHost: () => Promise<void>
): Promise<void> {
  let reconciliationError: unknown;
  try {
    await reconcileWaitlist();
  } catch (error) {
    reconciliationError = error;
  }

  try {
    await notifyHost();
  } catch (error) {
    console.warn('取消已生效，但團主通知未完成:', error instanceof Error ? error.message : '未知錯誤');
  }

  if (reconciliationError) throw reconciliationError;
}
