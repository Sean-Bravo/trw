import NextAuth, { NextAuthOptions } from "next-auth";
import { cookies } from 'next/headers';
import { ATTRIBUTION_COOKIE, parseAttributionCookie, type Attribution } from '@/lib/attribution';
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { validateEmail, validatePassword } from "@/lib/validation";
import {
  authorizeCredentials,
  findOrCreateOAuthUser,
  findUserByEmail,
  getIdleTimeoutMinutes,
} from "@/lib/auth-db";
import { DEFAULT_IDLE_TIMEOUT_MINUTES, isIdleExpired } from "@/lib/idle-timeout";
import { safeRedirect } from "@/lib/safe-redirect";

/**
 * First-touch attribution for a Google signup (lib/attribution.ts). Only a
 * brand-new user row stores it; findOrCreateOAuthUser ignores it otherwise.
 * cookies() is only readable inside a request — null anywhere else.
 */
async function readSignupAttribution(): Promise<Attribution | null> {
  try {
    const store = await cookies();
    return parseAttributionCookie(store.get(ATTRIBUTION_COOKIE)?.value);
  } catch {
    return null;
  }
}

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
        password: { label: "Password", type: "password" },
        // F30: single-use token from /api/auth/2fa/login-verify; required
        // when the account has 2FA on. See authorizeCredentials.
        twoFactorToken: { label: "2FA token", type: "text" }
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
          // Password, lockout, verified email and (when enabled) 2FA proof
          const user = await authorizeCredentials(
            validatedEmail,
            credentials.password,
            credentials.twoFactorToken || undefined
          );

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
    async signIn({ user, account, profile }) {
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
            account.expires_at,
            await readSignupAttribution(),
            // F31: Google's OIDC claim; the NextAuth Profile type omits it.
            (profile as { email_verified?: boolean } | undefined)?.email_verified === true
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

    async jwt({ token, user, account, trigger, session }) {
      const now = Date.now();

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

      // Automatic sign-out (docs/AUTO_LOGOUT_PLAN.md). A sign-in starts the
      // clock and is the "recent sign-in" that turning the limit off needs.
      if (user) {
        token.authTime = now;
        token.lastActivity = now;
        token.idleExpired = false;
        token.idleTimeoutMin = token.id ? await getIdleTimeoutMinutes(token.id) : DEFAULT_IDLE_TIMEOUT_MINUTES;
        return token;
      }

      // Tokens issued before this feature: start their clock now rather than
      // signing everyone out on deploy.
      if (typeof token.lastActivity !== 'number') token.lastActivity = now;
      if (typeof token.idleTimeoutMin !== 'number') token.idleTimeoutMin = DEFAULT_IDLE_TIMEOUT_MINUTES;

      // Checked against the PREVIOUS activity first, so a ping sent after the
      // limit can't revive an expired session.
      if (token.idleExpired || isIdleExpired(token.lastActivity, token.idleTimeoutMin, now)) {
        token.idleExpired = true;
        return token;
      }

      // Only the browser's explicit activity ping (useSession().update) moves
      // the clock. Page loads and getServerSession in API routes, including
      // the dashboard's job polling every 2.5 s, never do.
      if (trigger === 'update' && session && typeof session === 'object') {
        const update = session as { activity?: unknown; idleTimeoutChanged?: unknown };
        if (update.activity === true) token.lastActivity = now;
        // The new limit is read from the database, never taken from the client.
        if (update.idleTimeoutChanged === true && token.id) {
          token.idleTimeoutMin = await getIdleTimeoutMinutes(token.id);
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Idle past the limit: no user, which every page (redirect to /login)
      // and API route (401) already treats as signed out.
      if (token?.idleExpired) {
        return { expires: session.expires, idleExpired: true } as unknown as typeof session;
      }

      if (token) {
        session.idleTimeoutMin = token.idleTimeoutMin;
        session.lastActivity = token.lastActivity;
        session.authTime = token.authTime;
      }

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
