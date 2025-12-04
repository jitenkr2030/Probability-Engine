import { NextRequest, NextResponse } from "next/server"
import { handleWebhook } from "@/lib/stripe"
import Stripe from "stripe"

/* Stripe will be initialized lazily in the POST handler to avoid build-time env dependency */

/* Webhook secret will be read at request time */

export async function POST(request: NextRequest) {
  try {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      console.error("STRIPE_SECRET_KEY not configured")
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }
    const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" })
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured")
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }

    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the webhook event
    await handleWebhook(event)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}