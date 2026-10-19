export type PublicUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
};

export type AuthenticatedRequest = {
  user: PublicUser;
  sessionToken: string;
  header(name: string): string | undefined;
};
