import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { validateEmail, validatePassword } from "@/lib/validation";
import {
  verifyPassword,
  findOrCreateOAuthUser,
  findUserByEmail,
  findUserById,
} from "@/lib/auth-db";
import { queryOne } from "@/lib/db";
import { verifyToken, verifyBackupCode } from "@/lib/2fa";
import { safeRedirect } from "@/lib/safe-redirect";

export const authOptions: NextAuthOptions = {
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
        if (!emailValidation.success || !emailValidation.data) {
          throw new Error("Invalid email");
        }

        // Validate password format
        const passwordValidation = validatePassword(credentials.password);
        if (!passwordValidation.success) {
          throw new Error("Invalid password");
        }

        const validatedEmail = emailValidation.data;

        try {
          // Verify credentials directly against Neon DB
          const user = await verifyPassword(validatedEmail, credentials.password);

          if (!user) {
            throw new Error("Invalid credentials");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('[Auth] Login error:', error);
          throw new Error("Invalid credentials");
        }
      }
    })
  ],

  // M-5: reduced from 30 days to 7 days. JWTs are stateless and cannot
  // be revoked server-side, so a stolen token is valid until expiry —
  // 30 days is too long for an app handling tax/banking data.
  // SECURITY_AUDIT.md §M-5
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,  // 7 days (was 30)
    updateAge: 60 * 60,         // sliding refresh every hour (was 24h)
  },

  // JWT configuration
  jwt: {
    maxAge: 7 * 24 * 60 * 60,  // 7 days (was 30)
  },

  // M-16: explicit cookie configuration. NextAuth defaults are
  // reasonable, but relying on them means a future NextAuth upgrade
  // could silently change them. Pinning explicitly so any change is
  // visible in version control. SECURITY_AUDIT.md §M-16
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Host-next-auth.csrf-token"
          : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.callback-url"
          : "next-auth.callback-url",
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
  },

  // Callbacks
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, create/update user directly in Neon DB
      if (account?.provider === 'google' && user.email) {
        try {
          await findOrCreateOAuthUser(
            account.provider,
            account.providerAccountId,
            user.email,
            user.name || undefined,
            account.access_token || undefined,
            account.refresh_token || undefined,
            account.expires_at
          );
          return true;
        } catch (error) {
          console.error('[Auth] OAuth user creation failed:', error);
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
          const dbUser = await findUserByEmail(user.email);

          if (dbUser) {
            token.id = dbUser.id;
            token.email = user.email;
            token.name = user.name;
          }
        } else {
          // Credentials provider - user.id is already the database ID
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
        }
      }

      // Add access token for OAuth providers
      if (account) {
        token.accessToken = account.access_token;
      }

      return token;
    },

    async session({ session, token }) {
      // Add user data to session
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }

      return session;
    },

    // H-15: see lib/safe-redirect.ts for the open-redirect fix logic.
    async redirect({ url, baseUrl }) {
      return safeRedirect(url, baseUrl);
    }
  },

  // Events for logging
  events: {
    async signIn({ user }) {
      console.log(`[Auth] User signed in: ${user.email ?? 'unknown'}`);
    },
    async signOut() {
      console.log("[Auth] User signed out");
    },
    async createUser({ user }) {
      console.log(`[Auth] New user created: ${user.email ?? 'unknown'}`);
    }
  },

  // Security
  secret: process.env['NEXTAUTH_SECRET'],

  // Enable debug in development
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
