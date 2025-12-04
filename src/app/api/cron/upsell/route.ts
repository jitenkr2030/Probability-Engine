import { upsellEngine } from "@/lib/upsell-engine"

export async function GET(request: Request) {
  try {
    // Run upsell evaluation
    await upsellEngine.evaluateTriggers()
    
    // Get upsell opportunities
    const opportunities = await upsellEngine.getUpsellOpportunities()
    
    // Get trigger status
    const triggerStatus = upsellEngine.getTriggerStatus()

    return new Response(JSON.stringify({
      success: true,
      message: "Upsell evaluation completed",
      opportunities: opportunities.length,
      triggerStatus,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error("Upsell cron job error:", error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}