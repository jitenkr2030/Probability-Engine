"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function GettingStarted() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      // User is logged in, they can access the guide
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icons.activity className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Probability Engine</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost">Home</Button>
              </Link>
              {!session && (
                <>
                  <Link href="/auth/signin">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )}
              {session && (
                <Link href="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Getting Started with Probability Engine
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Follow this comprehensive guide to set up your account, understand the platform, 
            and start making AI-powered trading decisions in minutes.
          </p>
        </div>

        {/* Quick Start Steps */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Quick Start Guide</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Sign up for your free account in seconds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Choose your plan and verify your email to get started with AI-powered predictions.
                </p>
                {!session && (
                  <Link href="/auth/signup">
                    <Button className="w-full">Sign Up Now</Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <CardTitle>Complete Setup</CardTitle>
                <CardDescription>
                  Configure your profile and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Set up your trading preferences, risk tolerance, and notification settings.
                </p>
                {session && (
                  <Link href="/dashboard">
                    <Button className="w-full">Complete Setup</Button>
                  </Link>
                )}
                {!session && (
                  <Button className="w-full" disabled>Sign In First</Button>
                )}
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <CardTitle>Get Predictions</CardTitle>
                <CardDescription>
                  Start receiving AI-powered insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Access real-time predictions for your favorite stocks and indices.
                </p>
                {session && (
                  <Link href="/dashboard">
                    <Button className="w-full">View Predictions</Button>
                  </Link>
                )}
                {!session && (
                  <Button className="w-full" disabled>Sign In First</Button>
                )}
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  4
                </div>
                <CardTitle>Start Trading</CardTitle>
                <CardDescription>
                  Execute trades with confidence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Use our insights to make informed trading decisions and track your performance.
                </p>
                {session && (
                  <Link href="/dashboard">
                    <Button className="w-full">Go to Dashboard</Button>
                  </Link>
                )}
                {!session && (
                  <Button className="w-full" disabled>Sign In First</Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Setup Guide */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Account Setup</h2>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Icons.user className="h-5 w-5 text-blue-600" />
                    <span>1. Registration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Create your account with just an email address and password. We'll send a verification email to confirm your account.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Use a valid email address</li>
                    <li>• Choose a strong password</li>
                    <li>• Verify your email within 24 hours</li>
                  </ul>
                  {!session && (
                    <Link href="/auth/signup">
                      <Button className="w-full">Create Account</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Icons.creditCard className="h-5 w-5 text-green-600" />
                    <span>2. Choose Your Plan</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Select the plan that best fits your trading needs. Start with our free tier to explore the platform.
                  </p>
                  <div className="bg-gray-50 p-3 rounded text-xs">
                    <strong>Free Tier:</strong> 5 predictions/day, 15-min delay<br/>
                    <strong>Basic Tier:</strong> $29/month, real-time predictions<br/>
                    <strong>Professional:</strong> $99/month, advanced features<br/>
                    <strong>Enterprise:</strong> $499/month, unlimited access
                  </div>
                  <Link href="/">
                    <Button variant="outline" className="w-full">View All Plans</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Icons.settings className="h-5 w-5 text-purple-600" />
                    <span>3. Profile Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Complete your profile to personalize your experience and improve prediction accuracy.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Set your trading experience level</li>
                    <li>• Configure risk tolerance</li>
                    <li>• Add preferred stocks and indices</li>
                    <li>• Set up notification preferences</li>
                  </ul>
                  {session && (
                    <Link href="/dashboard">
                      <Button className="w-full">Configure Profile</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Platform Features</h2>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Icons.trendingUp className="h-5 w-5 text-blue-600" />
                    <span>AI Predictions Dashboard</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Access real-time AI-powered predictions with confidence scores and risk assessments.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Real-time stock predictions</li>
                    <li>• Confidence scores (85-95%)</li>
                    <li>• Risk assessment indicators</li>
                    <li>• Historical performance data</li>
                  </ul>
                  {session && (
                    <Link href="/dashboard">
                      <Button className="w-full">View Dashboard</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Icons.key className="h-5 w-5 text-orange-600" />
                    <span>API Access</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Integrate Probability Engine predictions into your own applications and trading systems.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• RESTful API with WebSocket support</li>
                    <li>• Multiple programming language SDKs</li>
                    <li>• Rate limiting and usage tracking</li>
                    <li>• Comprehensive documentation</li>
                  </ul>
                  {session && (
                    <Link href="/dashboard">
                      <Button className="w-full">Manage API Keys</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Icons.barChart className="h-5 w-5 text-green-600" />
                    <span>Analytics & Reporting</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Track your trading performance and analyze the effectiveness of AI predictions.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Performance metrics and ROI tracking</li>
                    <li>• Prediction accuracy analysis</li>
                    <li>• Customizable reports</li>
                    <li>• Data export capabilities</li>
                  </ul>
                  {session && (
                    <Link href="/dashboard">
                      <Button className="w-full">View Analytics</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Tips & Best Practices */}
        <div className="bg-blue-50 rounded-2xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Tips for Success</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Icons.shield className="h-5 w-5 text-green-600" />
                  <span>Start Small</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Begin with the free tier to understand how predictions work before upgrading to paid plans. Test with small investments first.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Icons.brain className="h-5 w-5 text-purple-600" />
                  <span>Trust the AI</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Our AI models analyze millions of data points. Trust the predictions but always consider your risk tolerance and investment goals.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Icons.lineChart className="h-5 w-5 text-blue-600" />
                  <span>Track Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Regularly review your trading performance and prediction accuracy. Use analytics to refine your strategy over time.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How accurate are the predictions?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Our AI predictions achieve 85-95% accuracy depending on the stock and market conditions. 
                  Major indices typically show higher accuracy rates.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel my subscription anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Yes, you can cancel your subscription at any time. You'll continue to have access 
                  until the end of your current billing period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is my data secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Absolutely. We use bank-grade encryption and security measures to protect your data. 
                  We never share your personal information with third parties.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do you offer customer support?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Yes, we offer 24/7 customer support for paid plans. Free tier users have access to 
                  community support and documentation.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of traders who are already using Probability Engine to make smarter, data-driven trading decisions.
          </p>
          {!session && (
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/auth/signup">
                <Button size="lg" className="text-lg px-8 py-3">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                  Learn More
                </Button>
              </Link>
            </div>
          )}
          {session && (
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8 py-3">
                Go to Dashboard
              </Button>
            </Link>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Icons.activity className="h-6 w-6 text-blue-400" />
                <span className="font-semibold">Probability Engine</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered stock predictions for smarter trading decisions.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/" className="hover:text-white">Features</Link></li>
                <li><Link href="/" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/getting-started" className="hover:text-white">Getting Started</Link></li>
                <li><Link href="/" className="hover:text-white">API Docs</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/" className="hover:text-white">About</Link></li>
                <li><Link href="/" className="hover:text-white">Blog</Link></li>
                <li><Link href="/" className="hover:text-white">Careers</Link></li>
                <li><Link href="/" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/" className="hover:text-white">Documentation</Link></li>
                <li><Link href="/" className="hover:text-white">Community</Link></li>
                <li><Link href="/" className="hover:text-white">Status</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 Probability Engine. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}