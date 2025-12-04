import { PrismaClient } from "@prisma/client"
import Stripe from "stripe"
import { subscriptionPlans } from "./subscription-plans"

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function createStripeCustomer(email: string, name?: string) {
  const customer = await stripe.customers.create({
    email,
    name,
  })
  return customer
}

export async function createSubscription(userId: string, priceId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  })

  if (!user) {
    throw new Error("User not found")
  }

  // Create or get Stripe customer
  let stripeCustomer
  if (user.customerId) {
    stripeCustomer = await stripe.customers.retrieve(user.customerId)
  } else {
    stripeCustomer = await createStripeCustomer(user.email!, user.name || undefined)
    await prisma.user.update({
      where: { id: userId },
      data: { customerId: stripeCustomer.id }
    })
  }

  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomer.id,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
  })

  // Update user subscription in database
  const plan = subscriptionPlans.find(p => 
    p.stripePriceIds.monthly === priceId || p.stripePriceIds.yearly === priceId
  )

  if (plan) {
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: plan.id,
        status: "PENDING",
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        billingCycle: priceId.includes("yearly") ? "yearly" : "monthly",
        amount: plan.price.monthly * 100, // Convert to cents
        apiCallsLimit: plan.limits.apiCalls,
        predictionsLimit: plan.limits.predictions,
        teamMembersLimit: plan.limits.teamMembers,
      },
      create: {
        userId,
        plan: plan.id,
        status: "PENDING",
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        billingCycle: priceId.includes("yearly") ? "yearly" : "monthly",
        amount: plan.price.monthly * 100,
        apiCallsLimit: plan.limits.apiCalls,
        predictionsLimit: plan.limits.predictions,
        teamMembersLimit: plan.limits.teamMembers,
      }
    })
  }

  return subscription
}

export async function cancelSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  })

  if (!user || !user.subscription?.stripeSubscriptionId) {
    throw new Error("No active subscription found")
  }

  // Cancel subscription in Stripe
  await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  })

  // Update subscription in database
  await prisma.subscription.update({
    where: { userId },
    data: { status: "CANCELLED" }
  })

  return { success: true }
}

export async function reactivateSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  })

  if (!user || !user.subscription?.stripeSubscriptionId) {
    throw new Error("No subscription found")
  }

  // Reactivate subscription in Stripe
  await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  })

  // Update subscription in database
  await prisma.subscription.update({
    where: { userId },
    data: { status: "ACTIVE" }
  })

  return { success: true }
}

export async function updateSubscription(userId: string, newPriceId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  })

  if (!user || !user.subscription?.stripeSubscriptionId) {
    throw new Error("No active subscription found")
  }

  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId)

  // Find the subscription item to update
  const subscriptionItem = subscription.items.data[0]

  // Update subscription in Stripe
  await stripe.subscriptionItems.update(subscriptionItem.id, {
    price: newPriceId,
  })

  // Update subscription in database
  const plan = subscriptionPlans.find(p => 
    p.stripePriceIds.monthly === newPriceId || p.stripePriceIds.yearly === newPriceId
  )

  if (plan) {
    await prisma.subscription.update({
      where: { userId },
      data: {
        plan: plan.id,
        stripePriceId: newPriceId,
        billingCycle: newPriceId.includes("yearly") ? "yearly" : "monthly",
        amount: plan.price.monthly * 100,
        apiCallsLimit: plan.limits.apiCalls,
        predictionsLimit: plan.limits.predictions,
        teamMembersLimit: plan.limits.teamMembers,
      }
    })
  }

  return { success: true }
}

export async function handleWebhook(event: Stripe.Event) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break
    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
      break
    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.Invoice)
      break
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  // Find user by Stripe customer ID
  const user = await prisma.user.findFirst({
    where: { customerId },
    include: { subscription: true }
  })

  if (!user) return

  const priceId = subscription.items.data[0]?.price?.id
  const plan = subscriptionPlans.find(p => 
    p.stripePriceIds.monthly === priceId || p.stripePriceIds.yearly === priceId
  )

  if (plan) {
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: subscription.status === "active" ? "ACTIVE" : "CANCELLED",
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        plan: plan.id,
        stripePriceId: priceId,
        billingCycle: priceId?.includes("yearly") ? "yearly" : "monthly",
        amount: plan.price.monthly * 100,
        apiCallsLimit: plan.limits.apiCalls,
        predictionsLimit: plan.limits.predictions,
        teamMembersLimit: plan.limits.teamMembers,
      }
    })
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  const user = await prisma.user.findFirst({
    where: { customerId }
  })

  if (!user) return

  await prisma.subscription.update({
    where: { userId: user.id },
    data: { status: "CANCELLED" }
  })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  const user = await prisma.user.findFirst({
    where: { customerId }
  })

  if (!user) return

  // Create audit log for successful payment
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "PAYMENT_SUCCEEDED",
      resource: "Subscription",
      metadata: {
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
      }
    }
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  const user = await prisma.user.findFirst({
    where: { customerId }
  })

  if (!user) return

  // Create audit log for failed payment
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "PAYMENT_FAILED",
      resource: "Subscription",
      metadata: {
        invoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
      }
    }
  })

  // Create notification for user
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "BILLING",
      title: "Payment Failed",
      message: "Your recent payment failed. Please update your payment method to avoid service interruption.",
      metadata: {
        invoiceId: invoice.id,
        amount: invoice.amount_due,
      }
    }
  })
}