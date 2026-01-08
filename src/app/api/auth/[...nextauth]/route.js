import NextAuth from "next-auth"
import GitHubProvider from "next-auth/providers/github"
import { prisma } from "../../../../lib/prisma"


export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
  async jwt({ token, account, profile }) {
    if (account?.provider === "github") {
      const user = await prisma.user.upsert({
        where: { githubId: account.providerAccountId },
        update: {
          name: profile.name,
          email: profile.email,
          image: profile.avatar_url
        },
        create: {
          id: crypto.randomUUID(),
          githubId: account.providerAccountId,
          name: profile.name,
          email: profile.email,
          image: profile.avatar_url
        }
      })

      token.userId = user.id
    }

    return token
  },

  async session({ session, token }) {
    if (token.userId) {
      session.user.id = token.userId
    }
    return session
  }
}




}
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
