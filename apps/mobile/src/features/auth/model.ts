export type AuthUser = {
  avatarUrl?: string;
  id: number;
  nickname: string;
  username: string;
};

export type AuthSession = {
  expiresAt: number;
  refreshExpiresAt: number;
  refreshToken: string;
  sessionId: string;
  sessionToken: string;
  user: AuthUser;
};

export type DeviceSession = {
  createdAt: number;
  current: boolean;
  deviceName: string;
  expiresAt: number;
  lastUsedAt: number;
  sessionId: string;
};
