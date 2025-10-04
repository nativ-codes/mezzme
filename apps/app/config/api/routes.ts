const BASE_URL = process.env.EXPO_PUBLIC_SERVER_API_URL;

export const APIRoutes = {
  auth: {
    login: `${BASE_URL}/auth/login`,
  },
  users: {
    getAll: `${BASE_URL}/users`,
    follow: (targetUserId: string) => `${BASE_URL}/users/${targetUserId}/follow`,
    unfollow: (targetUserId: string) => `${BASE_URL}/users/${targetUserId}/unfollow`,
    getProfile: (targetUserId: string) => `${BASE_URL}/users/${targetUserId}`,
    create: `${BASE_URL}/users`,
    profilePictures: {
      add: `${BASE_URL}/users/profile-pictures`,
      remove: `${BASE_URL}/users/profile-pictures`,
      setPrimary: `${BASE_URL}/users/profile-pictures/primary`,
    },
  },
} as const;
