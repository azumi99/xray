import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get the same token key used in authAPI for consistency
const AUTH_TOKEN_KEY = "token";

// HTTP link to GraphQL server
const httpLink = createHttpLink({
  uri: process.env.EXPO_PUBLIC_GRAPHQL_URL || 'http://localhost:8000/graphql',
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