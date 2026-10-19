export type PublicUser = {
  id: string;
  email: string;
  name: string;
  alias?: string;
  picture?: string;
  publicSlug?: string;
  shareEnabled: boolean;
  admin: boolean;
};

export type AuthenticatedRequest = {
  user: PublicUser;
  sessionToken: string;
  header(name: string): string | undefined;
};
