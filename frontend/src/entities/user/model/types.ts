export type UserRole = 'ADMIN' | 'USER';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
}
