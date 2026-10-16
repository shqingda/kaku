export type AuthRequestIdentity = {
  authEpoch: number;
  sessionId: string;
  userId: number;
};

export type AuthRequest = (path: string, init?: RequestInit) => Promise<Response>;
export type AuthRequestScope = {
  identity: AuthRequestIdentity;
  isCurrent: () => boolean;
  request: AuthRequest;
};

export class AuthSessionChangedError extends Error {
  constructor() {
    super('登录状态已变化，请重试当前操作。');
    this.name = 'AuthSessionChangedError';
  }
}
