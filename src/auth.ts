import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: { id: string; username: string } & DefaultSession["user"];
  }
  interface User {
    username?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  logger: {
    // Una password sbagliata non è un errore del server: niente rumore nei log.
    error(error) {
      if (error.name !== "CredentialsSignin") console.error(error);
    },
  },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!username || !password) return null;
        const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
        return { id: user.id, name: user.username, username: user.username };
      },
    }),
  ],
  callbacks: {
    // L'id utente va copiato nel token e poi nella sessione (§14.6).
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.username = user.username;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.username = token.username as string;
      return session;
    },
  },
});

/** Sessione corrente o null. */
export async function currentUser() {
  const session = await auth();
  return session?.user?.id ? session.user : null;
}

/** Utente loggato, altrimenti reindirizza al login. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
