export const MAX_PARTY_SIZE = 3;

type RegistrationParty = { party_size: number };
type QueuedParty = RegistrationParty & { id: string; waitlist_order?: number | null };

export function isValidPartySize(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_PARTY_SIZE;
}

// 歷史資料若有非法 party_size，以一人保守計算，避免負數倒扣可用席次。
export function countPeople(registrations: readonly RegistrationParty[]): number {
  return registrations.reduce(
    (sum, registration) => sum + (Number.isInteger(registration.party_size) && registration.party_size > 0 ? registration.party_size : 1),
    0
  );
}

export function chooseRegistrationPlacement(
  mainCount: number,
  waitlist: readonly QueuedParty[],
  partySize: number,
  maxPlayers: number,
  maxWaitlist: number
): { status: 'main' | 'waitlist'; waitlist_order: number | null } | null {
  if (partySize > maxPlayers) return null;
  // 已有備取者時，新人不得越過排在前面的多人組直接取得正取空位。
  if (waitlist.length === 0 && mainCount + partySize <= maxPlayers) {
    return { status: 'main', waitlist_order: null };
  }
  if (countPeople(waitlist) + partySize > maxWaitlist) return null;
  const lastOrder = Math.max(0, ...waitlist.map((registration) => registration.waitlist_order ?? 0));
  return { status: 'waitlist', waitlist_order: lastOrder + 1 };
}

// 呼叫端須依 waitlist_order 排序。多人必須整組遞補；第一組無法容納時不可跳過。
export function choosePromotions(waitlist: readonly QueuedParty[], availableSlots: number): string[] {
  const promoted: string[] = [];
  let slots = availableSlots;
  for (const registration of waitlist) {
    const partySize = Number.isInteger(registration.party_size) && registration.party_size > 0 ? registration.party_size : 1;
    if (partySize > slots) break;
    promoted.push(registration.id);
    slots -= partySize;
  }
  return promoted;
}

export function registrationSessionStatus(mainCount: number, maxPlayers: number, waitingCount: number): 'full' | 'open' {
  return mainCount >= maxPlayers || waitingCount > 0 ? 'full' : 'open';
}
