import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { validateEmail, validatePassword } from "@/lib/validation";

// This is a template - you'll need to implement actual database operations
// For now, this shows the structure and security considerations

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
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

        // TODO: Implement actual database lookup
        // const user = await getUserByEmail(emailValidation.data);
        // if (!user || !await verifyPassword(credentials.password, user.hashedPassword)) {
        //   throw new Error("Invalid credentials");
        // }
        // return { id: user.id, email: user.email, name: user.name };

        // Placeholder return - replace with actual DB logic
        return null;
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

  // Pages configuration
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
    newUser: "/auth/new-user"
  },

  // Callbacks
  callbacks: {
    async jwt({ token, user, account }) {
      // Add user ID to token
      if (user) {
        token.id = user.id;
      }

      // Add access token for OAuth providers
      if (account) {
        token.accessToken = account.access_token;
      }

      return token;
    },

    async session({ session, token }) {
      // Add user ID to session
      if (session.user) {
        session.user.id = token.id as string;
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
    async signIn({ user, account, profile, isNewUser }) {
      // TODO: Log successful sign-in
      console.log(`User signed in: ${user.email}`);
    },
    async signOut({ session, token }) {
      // TODO: Log sign-out
      console.log("User signed out");
    },
    async createUser({ user }) {
      // TODO: Log new user creation
      console.log(`New user created: ${user.email}`);
    }
  },

  // Security
  secret: process.env.NEXTAUTH_SECRET,

  // Enable debug in development
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
