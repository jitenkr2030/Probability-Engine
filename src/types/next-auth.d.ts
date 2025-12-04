import { DefaultSession, DefaultUser } from "next-auth"
import { UserRole, UserStatus, SubscriptionPlan, SubscriptionStatus } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      status: UserStatus
      subscription?: {
        id: string
        plan: SubscriptionPlan
        status: SubscriptionStatus
        apiCallsLimit: number
        apiCallsUsed: number
        predictionsLimit: number
        predictionsUsed: number
        trialEndsAt?: Date
      }
      profile?: {
        id: string
        company?: string
        phone?: string
        timezone: string
        language: string
      }
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: UserRole
    status: UserStatus
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    status: UserStatus
    subscription?: {
      id: string
      plan: SubscriptionPlan
      status: SubscriptionStatus
      apiCallsLimit: number
      apiCallsUsed: number
      predictionsLimit: number
      predictionsUsed: number
      trialEndsAt?: Date
    }
    profile?: {
      id: string
      company?: string
      phone?: string
      timezone: string
      language: string
    }
  }
}