import { redirect } from 'next/navigation';

// 當使用者訪問 /liff 根路徑時，自動安全導向至場次報名頁面 /liff/sessions
export default function LiffRootPage() {
  redirect('/liff/sessions');
}
