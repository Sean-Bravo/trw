import 'next-auth';

declare module 'next-auth' {
  interface Session {
    /** Automatic sign-out: the user's limit in minutes (0 = never). */
    idleTimeoutMin?: number;
    /** Epoch ms of the last real user activity the server recorded. */
    lastActivity?: number;
    /** Epoch ms of the last actual sign-in. */
    authTime?: number;
    /** Set (and user removed) once the session was idle past its limit. */
    idleExpired?: boolean;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    accessToken?: string;
    authTime?: number;
    lastActivity?: number;
    idleTimeoutMin?: number;
    idleExpired?: boolean;
  }
}
