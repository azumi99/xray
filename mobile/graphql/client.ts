import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get the same token key used by authAPI for consistency
const AUTH_TOKEN_KEY = "token";

// Pakai EXPO_PUBLIC_GRAPHQL_URL kalau ada (produksi bisa relative path '/graphql'
// supaya domain-agnostic). Di native dev pakai IP LAN dari env, fallback localhost.
const GRAPHQL_URI =
  process.env.EXPO_PUBLIC_GRAPHQL_URL || 'http://localhost:3000/graphql';

// HTTP link to GraphQL server
const httpLink = createHttpLink({
  uri: GRAPHQL_URI,
  // Add headers for debugging
  headers: {
    'Content-Type': 'application/json',
  },
});

// Middleware to add auth headers if needed
const authLink = setContext(async (_, { headers }) => {
  // Get the authentication token from storage if it exists
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

// Create Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export default client;