import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { validateEmail, validatePassword } from "@/lib/validation";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

        // Database lookup
        const user = await prisma.user.findUnique({
          where: { email: emailValidation.data }
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscriptionTier as "free" | "pro" | "premium"
        };
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
    async signIn({ user, account, profile }) {
      // For OAuth providers, create user and subscription if doesn't exist
      if (account?.provider === 'google' && user.email) {
        // Check if user exists
        let existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        });

        // Create user if doesn't exist
        if (!existingUser) {
          existingUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || null,
              image: user.image || null,
              emailVerified: new Date(),
              subscriptionTier: 'free'
            }
          });

          // Create free tier subscription for new user
          await prisma.subscription.create({
            data: {
              userId: existingUser.id,
              tier: 'free',
              status: 'active'
            }
          });
        } else {
          // For existing users, check if subscription exists
          const existingSubscription = await prisma.subscription.findUnique({
            where: { userId: existingUser.id }
          });

          // Create free tier subscription if doesn't exist
          if (!existingSubscription) {
            await prisma.subscription.create({
              data: {
                userId: existingUser.id,
                tier: 'free',
                status: 'active'
              }
            });
          }
        }

        // Create or update Account record for OAuth connection
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId
            }
          },
          create: {
            userId: existingUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refresh_token: account.refresh_token,
            access_token: account.access_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state
          },
          update: {
            refresh_token: account.refresh_token,
            access_token: account.access_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state
          }
        });

        return true;
      }

      // For credentials provider
      if (account?.provider === 'credentials') {
        return true;
      }

      return true;
    },

    async jwt({ token, user, account, profile, trigger }) {
      // Initial sign-in
      if (user && user.email) {
        // For OAuth, look up the user by email to get our database ID
        // For credentials, user.id is already the database ID
        if (account?.provider === 'google') {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, subscriptionTier: true }
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.email = user.email;
            token.name = user.name;
            token['subscriptionTier'] = dbUser['subscriptionTier'];
          }
        } else {
          // Credentials provider - user.id is already the database ID
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;

          // Fetch subscription tier from database
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { subscriptionTier: true }
          });

          token['subscriptionTier'] = dbUser?.['subscriptionTier'] || 'free';
        }
      }

      // Add access token for OAuth providers
      if (account) {
        token.accessToken = account.access_token;
      }

      // Handle session refresh
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { subscriptionTier: true }
        });

        if (dbUser) {
          token['subscriptionTier'] = dbUser['subscriptionTier'];
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
