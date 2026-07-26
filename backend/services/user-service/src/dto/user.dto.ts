export interface CreateUserDto {
  authUserId: string;

  email: string;

  firstName?: string;

  lastName?: string;

  avatar?: string;
}

export interface UpdateUserDto {
  firstName?: string;

  lastName?: string;

  avatar?: string;

  preferences?: any;

  status?: string;
}
