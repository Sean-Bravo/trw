import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { validateEmail, validatePassword } from "@/lib/validation";

// Lambda API Gateway URL
const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://api.taxformatter.com';

// Helper to call Lambda auth endpoints
async function callLambdaAuth(endpoint: string, body: Record<string, unknown>) {
  const response = await fetch(`${API_GATEWAY_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Auth request failed: ${response.status}`);
  }

  return response.json();
}

async function getUserByEmail(email: string) {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/auth/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function getUserById(id: string) {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/auth/user?userId=${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  // Note: Adapter disabled to use JWT strategy with both OAuth and credentials
  // We manually handle user creation in the signIn callback
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env['GOOGLE_CLIENT_ID'] ?? "",
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),

    // Email/Password Provider
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        // Validate email format
        const emailValidation = validateEmail(credentials.email);
        if (!emailValidation.success) {
          throw new Error("Invalid email");
        }

        // Validate password format
        const passwordValidation = validatePassword(credentials.password);
        if (!passwordValidation.success) {
          throw new Error("Invalid password");
        }

        try {
          // Call Lambda to verify credentials
          const user = await callLambdaAuth('/auth/login', {
            email: emailValidation.data,
            password: credentials.password,
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            subscriptionTier: user.subscriptionTier as "free" | "pro" | "premium"
          };
        } catch {
          throw new Error("Invalid credentials");
        }
      }
    })
  ],

  // Session configuration
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // JWT configuration
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Pages configuration - use NextAuth default pages for now
  // pages: {
  //   signIn: "/auth/signin",
  //   signOut: "/auth/signout",
  //   error: "/auth/error",
  //   verifyRequest: "/auth/verify",
  //   newUser: "/auth/new-user"
  // },

  // Callbacks
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, create/update user via Lambda
      if (account?.provider === 'google' && user.email) {
        try {
          await callLambdaAuth('/auth/oauth-user', {
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
          });
          return true;
        } catch (error) {
          console.error('OAuth user creation failed:', error);
          return false;
        }
      }

      // For credentials provider
      if (account?.provider === 'credentials') {
        return true;
      }

      return true;
    },

    async jwt({ token, user, account, trigger }) {
      // Initial sign-in
      if (user && user.email) {
        // For OAuth, look up the user by email to get our database ID
        // For credentials, user.id is already the database ID
        if (account?.provider === 'google') {
          const dbUser = await getUserByEmail(user.email);

          if (dbUser) {
            token.id = dbUser.id;
            token.email = user.email;
            token.name = user.name;
            token['subscriptionTier'] = dbUser.subscriptionTier;
          }
        } else {
          // Credentials provider - user.id is already the database ID
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;

          // User already has subscriptionTier from login response
          token['subscriptionTier'] = (user as { subscriptionTier?: string }).subscriptionTier || 'free';
        }
      }

      // Add access token for OAuth providers
      if (account) {
        token.accessToken = account.access_token;
      }

      // Handle session refresh
      if (trigger === "update" && token.id) {
        const dbUser = await getUserById(token.id as string);

        if (dbUser) {
          token['subscriptionTier'] = dbUser.subscriptionTier;
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Add user data to session
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.subscriptionTier = (token['subscriptionTier'] as "free" | "pro" | "premium") || 'free';
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;

      return baseUrl;
    }
  },

  // Events for logging
  events: {
    async signIn({ user }) {
      // TODO: Log successful sign-in
      console.log(`User signed in: ${user.email ?? 'unknown'}`);
    },
    async signOut() {
      // TODO: Log sign-out
      console.log("User signed out");
    },
    async createUser({ user }) {
      // TODO: Log new user creation
      console.log(`New user created: ${user.email ?? 'unknown'}`);
    }
  },

  // Security
  secret: process.env['NEXTAUTH_SECRET'],

  // Enable debug in development
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
