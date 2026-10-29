import AsyncStorage from "@react-native-async-storage/async-storage";
import client from "@/graphql/client";
import { gql } from "@apollo/client";

// Constants
const AUTH_TOKEN_KEY = "token";

export interface LoginCredentials { email: string; password: string; }
export interface LoginResponse {
  token: string;
  user: { id: string; name: string; email: string };
}
export interface LogoutResponse { success: boolean; }

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user { id name email }
    }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation Logout { logout { success } }
`;

const ME_QUERY = gql`
  query Me { me { id name email } }
`;

const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const { data } = await client.mutate({
    mutation: LOGIN_MUTATION,
    variables: credentials,
  });
  const payload = data?.login as LoginResponse | undefined;
  if (!payload?.token) throw new Error('Invalid login response format');
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, payload.token);
  await AsyncStorage.setItem('userId', payload.user.id);
  await AsyncStorage.setItem('name', payload.user.name);
  return payload;
};

export const logoutAPI = async (): Promise<LogoutResponse> => {
  try {
    const { data } = await client.mutate({ mutation: LOGOUT_MUTATION });
    return data?.logout ?? { success: true };
  } finally {
    await clearAuthStorage();
    const { useAuthStore } = await import('../store/auth');
    useAuthStore.getState().logout();
  }
};

export const getCurrentUser = async () => {
  const { data } = await client.query({ query: ME_QUERY, fetchPolicy: 'network-only' });
  return data?.me ?? null;
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
  const { data } = await client.mutate({
    mutation: CHANGE_PASSWORD_MUTATION,
    variables: { currentPassword, newPassword },
  });
  return data?.changePassword === true;
};

const clearAuthStorage = async () => {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, 'userId', 'name', 'auth-storage']);
};

// Kept for compatibility with existing imports
export { AUTH_TOKEN_KEY };
