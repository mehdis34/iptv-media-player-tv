export type PortalProfileInput = {
  profileName: string;
  host: string;
  username: string;
  password: string;
  avatarSeed?: string | null;
};

export type PortalProfile = PortalProfileInput & {
  id: string;
  createdAt: number;
};
