export interface UserEntity {
  id: string;

  authUserId: string;

  email: string;

  firstName?: string;

  lastName?: string;

  avatar?: string;

  status: string;

  preferences?: any;
}
