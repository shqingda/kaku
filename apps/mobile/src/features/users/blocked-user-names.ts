import Storage from 'expo-sqlite/kv-store';

export type BlockedUserName = { nickname: string; username: string };
type BlockedUserNames = Record<string, BlockedUserName>;

// Bangumi 的屏蔽名单只有数字 ID，取消屏蔽却要用户名。这里按账号记下
// 在 Kaku 里见过的被屏蔽用户，让管理页能显示名字。
const storageKey = (ownerId: number) => `kaku:blocked-user-names:v1:${ownerId}`;

export function readBlockedUserNames(ownerId: number): BlockedUserNames {
  try {
    const parsed: unknown = JSON.parse(Storage.getItemSync(storageKey(ownerId)) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as BlockedUserNames) : {};
  } catch {
    return {};
  }
}

export function rememberBlockedUserName(
  ownerId: number,
  userId: number,
  name: BlockedUserName,
) {
  try {
    const names = readBlockedUserNames(ownerId);
    names[userId] = name;
    Storage.setItemSync(storageKey(ownerId), JSON.stringify(names));
  } catch {
    // 只影响管理页显示的名字，不阻塞屏蔽本身。
  }
}
