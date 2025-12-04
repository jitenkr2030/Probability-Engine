import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { UserRole, UserStatus, SubscriptionStatus } from "@prisma/client"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            subscription: true,
            profile: true
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Check if user account is active
        if (user.status !== UserStatus.ACTIVE) {
          throw new Error("Account is deactivated")
        }

        // Check subscription status
        if (user.subscription && user.subscription.status !== SubscriptionStatus.ACTIVE) {
          throw new Error("Subscription is inactive")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
          subscription: user.subscription,
          profile: user.profile
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role
        token.status = user.status
        token.subscription = user.subscription
        token.profile = user.profile
      }
      
      // Handle OAuth sign-in
      if (account && user) {
        // Create subscription for new OAuth users
        if (!user.subscription) {
          const subscription = await prisma.subscription.create({
            data: {
              userId: user.id,
              plan: 'FREE',
              status: 'TRIAL',
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
              apiCallsLimit: 1000,
              predictionsLimit: 50,
              teamMembersLimit: 1,
            }
          })
          token.subscription = subscription
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as UserRole
        session.user.status = token.status as UserStatus
        session.user.subscription = token.subscription as any
        session.user.profile = token.profile as any
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Create user if not exists for OAuth providers
      if (account?.provider !== "credentials") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! }
        })

        if (!existingUser) {
          const newUser = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name!,
              image: user.image,
              emailVerified: new Date(),
              status: UserStatus.ACTIVE,
              role: UserRole.USER,
            }
          })

          // Create free subscription for new user
          await prisma.subscription.create({
            data: {
              userId: newUser.id,
              plan: 'FREE',
              status: 'TRIAL',
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
              apiCallsLimit: 1000,
              predictionsLimit: 50,
              teamMembersLimit: 1,
            }
          })

          // Create profile for new user
          await prisma.profile.create({
            data: {
              userId: newUser.id,
              timezone: "UTC",
              language: "en",
            }
          })
        }
      }
      return true
    }
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    error: "/auth/error"
  }
}