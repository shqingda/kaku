export type AuthUser = {
  avatarUrl?: string;
  id: number;
  nickname: string;
  username: string;
};

export type AuthSession = import('@kaku/shared/auth-contract').AuthSessionResponse;

export type DeviceSession = {
  createdAt: number;
  current: boolean;
  deviceName: string;
  expiresAt: number;
  lastUsedAt: number;
  sessionId: string;
};
