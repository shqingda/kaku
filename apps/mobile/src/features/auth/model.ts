export type AuthUser = {
  avatarUrl?: string;
  id: number;
  nickname: string;
  username: string;
};

export type AuthSession = {
  expiresAt: number;
  sessionToken: string;
  user: AuthUser;
};
