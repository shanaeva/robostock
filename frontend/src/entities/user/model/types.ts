export type UserRole = 'ADMIN' | 'USER';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
};
