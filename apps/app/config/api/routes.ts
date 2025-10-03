const BASE_URL = process.env.EXPO_PUBLIC_SERVER_API_URL;

export const APIRoutes = {
  auth: {
    login: `${BASE_URL}/auth/login`,
  },
} as const;
