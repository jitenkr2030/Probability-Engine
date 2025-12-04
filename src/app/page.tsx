"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/ui/icons"
import Link from "next/link"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (session) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icons.activity className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Probability Engine</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-8 mb-20">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              AI-Powered Stock Predictions
              <span className="block text-blue-600">with 95% Accuracy</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Transform your trading strategy with cutting-edge artificial intelligence. 
              Get real-time, data-driven predictions that help you make smarter investment decisions 
              and maximize your returns in today's volatile markets.
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-4">
            <Link href="/getting-started">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Learn More
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                Start Your Free Trial
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Icons.users className="h-5 w-5 text-green-500" />
              <span>10,000+ Active Traders</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icons.trendingUp className="h-5 w-5 text-blue-500" />
              <span>$50M+ Trades Executed</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icons.shield className="h-5 w-5 text-purple-500" />
              <span>Bank-Grade Security</span>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mb-16">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Trusted by Leading Traders & Institutions</h3>
            <p className="text-gray-600">Join thousands of professionals who rely on our AI predictions</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">95%</div>
              <div className="text-sm text-gray-600">Prediction Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">24/7</div>
              <div className="text-sm text-gray-600">Market Monitoring</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">5ms</div>
              <div className="text-sm text-gray-600">Prediction Latency</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">1000+</div>
              <div className="text-sm text-gray-600">Stocks Covered</div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-20">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold text-gray-900">Why Choose Probability Engine?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive suite of features empowers traders at every level to make data-driven decisions with confidence.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <Icons.trendingUp className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Real-time Predictions</CardTitle>
                <CardDescription className="text-gray-600">
                  Get 5-minute ahead predictions for major stocks with real-time updates and industry-leading accuracy rates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 95%+ accuracy on major indices</li>
                  <li>• 5-minute prediction windows</li>
                  <li>• Real-time market data integration</li>
                  <li>• Instant alerts for significant movements</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <Icons.brain className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Advanced AI Analysis</CardTitle>
                <CardDescription className="text-gray-600">
                  Cutting-edge machine learning models analyze millions of data points to provide actionable insights.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Deep learning neural networks</li>
                  <li>• Sentiment analysis integration</li>
                  <li>• Technical pattern recognition</li>
                  <li>• Risk assessment algorithms</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <Icons.shield className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">Risk Management</CardTitle>
                <CardDescription className="text-gray-600">
                  Built-in risk assessment tools help you make safer trading decisions and protect your investments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Portfolio risk analysis</li>
                  <li>• Stop-loss recommendations</li>
                  <li>• Volatility forecasting</li>
                  <li>• Position sizing guidance</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <Icons.users className="h-8 w-8 text-orange-600" />
                </div>
                <CardTitle className="text-xl">Team Collaboration</CardTitle>
                <CardDescription className="text-gray-600">
                  Share insights and collaborate with your team members in real-time for better decision-making.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Real-time collaboration tools</li>
                  <li>• Shared watchlists and alerts</li>
                  <li>• Team performance analytics</li>
                  <li>• Role-based access control</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <Icons.key className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-xl">API Access</CardTitle>
                <CardDescription className="text-gray-600">
                  Integrate predictions into your own applications with our robust RESTful API and SDKs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• RESTful API with WebSocket support</li>
                  <li>• Multiple programming language SDKs</li>
                  <li>• Comprehensive documentation</li>
                  <li>• Rate limiting and usage tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <Icons.activity className="h-8 w-8 text-indigo-600" />
                </div>
                <CardTitle className="text-xl">Advanced Analytics</CardTitle>
                <CardDescription className="text-gray-600">
                  Track your performance with detailed analytics, reporting tools, and customizable dashboards.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Performance tracking and metrics</li>
                  <li>• Customizable dashboards</li>
                  <li>• Historical data analysis</li>
                  <li>• Export capabilities (CSV, JSON, Excel)</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gray-50 rounded-2xl p-12 mb-20">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started in minutes and start making smarter trading decisions today.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Sign Up</h3>
              <p className="text-gray-600 text-sm">Create your account in seconds and choose your plan</p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Connect Data</h3>
              <p className="text-gray-600 text-sm">Link your brokerage account or use our standalone predictions</p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Get Predictions</h3>
              <p className="text-gray-600 text-sm">Receive real-time AI-powered predictions and insights</p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-lg font-semibold mb-2">Trade Smarter</h3>
              <p className="text-gray-600 text-sm">Execute trades with confidence using our data-driven insights</p>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="text-center space-y-12">
          <h2 className="text-4xl font-bold text-gray-900">Choose Your Plan</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select the perfect plan for your trading needs. All plans include our core AI prediction engine with varying levels of access and features.
          </p>
          
          <div className="grid md:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {/* Free Tier */}
            <Card className="relative">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Free Tier</CardTitle>
                <div className="text-3xl font-bold">$0<span className="text-lg font-normal">/month</span></div>
                <CardDescription>Perfect for trying out our platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    5 stock predictions per day
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    15-minute prediction delay
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Basic dashboard
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Limited historical data
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Community support
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    1,000 API calls/month
                  </li>
                </ul>
                <Link href="/auth/signup">
                  <Button className="w-full" variant="outline">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Basic Tier */}
            <Card className="relative">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Basic Tier</CardTitle>
                <div className="text-3xl font-bold">$29<span className="text-lg font-normal">/month</span></div>
                <CardDescription>Essential features for active traders</CardDescription>
                <div className="text-sm text-green-600">Save $58 with yearly billing</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Real-time predictions for 50 major stocks (S&P 500)
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    5-minute prediction updates
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Basic confidence scores
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Mobile app access
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Email alerts for significant predictions
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Priority customer support
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    10,000 API calls/month
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Basic analytics dashboard
                  </li>
                </ul>
                <Link href="/auth/signup">
                  <Button className="w-full">
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Professional Tier */}
            <Card className="relative border-2 border-blue-500">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Professional Tier</CardTitle>
                <div className="text-3xl font-bold">$99<span className="text-lg font-normal">/month</span></div>
                <CardDescription>Advanced features for serious traders</CardDescription>
                <div className="text-sm text-green-600">Save $198 with yearly billing</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Everything in Basic, plus:
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    1000+ stocks coverage (NYSE, NASDAQ)
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Advanced technical indicators
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Sentiment analysis integration
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Risk management tools
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Portfolio tracking
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    API access (100,000 calls/month)
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Team collaboration (5 members)
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Advanced analytics & reporting
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Data export capabilities
                  </li>
                </ul>
                <Link href="/auth/signup">
                  <Button className="w-full">
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Enterprise Tier */}
            <Card className="relative">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Enterprise Tier</CardTitle>
                <div className="text-3xl font-bold">$499<span className="text-lg font-normal">/month</span></div>
                <CardDescription>Institutional-grade features for teams</CardDescription>
                <div className="text-sm text-green-600">Save $998 with yearly billing</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Everything in Professional, plus:
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Unlimited stock coverage
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Custom prediction models
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Institutional-grade data feeds
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Advanced backtesting tools
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Unlimited team collaboration
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Unlimited API access
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Trading integration support
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    White-label options
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Partnership revenue sharing
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Dedicated account manager
                  </li>
                  <li className="flex items-center">
                    <Icons.check className="h-4 w-4 text-green-500 mr-2" />
                    Custom integration support
                  </li>
                </ul>
                <Link href="/auth/signup">
                  <Button className="w-full">
                    Contact Sales
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Pay-per-Use API Pricing */}
          <div className="mt-16 space-y-8">
            <h3 className="text-3xl font-bold text-gray-900">Pay-per-Use API Pricing</h3>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Need flexible pricing? Our pay-per-use model lets you pay only for what you use, with volume discounts for high usage.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Prediction</CardTitle>
                  <div className="text-2xl font-bold">$0.01<span className="text-sm font-normal">/prediction</span></div>
                  <CardDescription>Standard 5-minute stock prediction</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Standard accuracy (85-90%)</li>
                    <li>• Basic confidence scores</li>
                    <li>• S&P 500 coverage</li>
                    <li>• 5-minute updates</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Advanced Prediction</CardTitle>
                  <div className="text-2xl font-bold">$0.05<span className="text-sm font-normal">/prediction</span></div>
                  <CardDescription>Enhanced prediction with sentiment analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• High accuracy (90-95%)</li>
                    <li>• Advanced confidence scores</li>
                    <li>• Sentiment analysis</li>
                    <li>• 1000+ stocks coverage</li>
                    <li>• Real-time updates</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Institutional Prediction</CardTitle>
                  <div className="text-2xl font-bold">$0.10<span className="text-sm font-normal">/prediction</span></div>
                  <CardDescription>Institutional-grade with risk management</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Maximum accuracy (95%+)</li>
                    <li>• Risk assessment</li>
                    <li>• Custom models</li>
                    <li>• Unlimited coverage</li>
                    <li>• Priority processing</li>
                    <li>• SLA guarantee</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg max-w-2xl mx-auto">
              <h4 className="font-semibold text-blue-900 mb-2">Volume Discounts</h4>
              <p className="text-blue-800 text-sm">
                Get 20% discount on all API calls when you exceed 10,000 predictions per month. 
                Enterprise customers get custom pricing based on usage patterns.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights & Benefits */}
        <div className="mb-20">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold text-gray-900">Why Traders Love Probability Engine</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover the powerful benefits that set our platform apart and help you achieve trading success.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Benefit Cards */}
            <Card className="text-center p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.trendingUp className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Higher Returns</h3>
              <p className="text-gray-600 text-sm mb-4">
                Achieve up to 40% better returns with AI-powered predictions
              </p>
              <div className="text-2xl font-bold text-green-600">+40%</div>
              <div className="text-xs text-gray-500">Average ROI Improvement</div>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Reduced Risk</h3>
              <p className="text-gray-600 text-sm mb-4">
                Advanced risk management protects your capital
              </p>
              <div className="text-2xl font-bold text-blue-600">-60%</div>
              <div className="text-xs text-gray-500">Risk Reduction</div>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.clock className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Time Saved</h3>
              <p className="text-gray-600 text-sm mb-4">
                Automate analysis and focus on strategic decisions
              </p>
              <div className="text-2xl font-bold text-purple-600">-80%</div>
              <div className="text-xs text-gray-500">Research Time</div>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.brain className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Accuracy</h3>
              <p className="text-gray-600 text-sm mb-4">
                Industry-leading prediction accuracy rates
              </p>
              <div className="text-2xl font-bold text-orange-600">95%+</div>
              <div className="text-xs text-gray-500">Prediction Accuracy</div>
            </Card>
          </div>

          {/* Detailed Benefits Section */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">For Individual Traders</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full mt-1">
                    <Icons.check className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Level the Playing Field</h4>
                    <p className="text-gray-600 text-sm">
                      Access institutional-grade AI technology that was once only available to hedge funds and large financial institutions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full mt-1">
                    <Icons.check className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Eliminate Emotional Trading</h4>
                    <p className="text-gray-600 text-sm">
                      Let data-driven AI predictions guide your decisions, removing emotional bias from your trading strategy.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full mt-1">
                    <Icons.check className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">24/7 Market Monitoring</h4>
                    <p className="text-gray-600 text-sm">
                      Never miss an opportunity with continuous market analysis and instant alerts for significant movements.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full mt-1">
                    <Icons.check className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Learn and Improve</h4>
                    <p className="text-gray-600 text-sm">
                      Access detailed analytics and performance tracking to understand your trading patterns and improve over time.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">For Teams & Institutions</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 p-2 rounded-full mt-1">
                    <Icons.check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Scalable Solutions</h4>
                    <p className="text-gray-600 text-sm">
                      From small teams to large institutions, our platform scales with your needs and grows with your organization.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 p-2 rounded-full mt-1">
                    <Icons.check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Custom Integration</h4>
                    <p className="text-gray-600 text-sm">
                      Seamlessly integrate with your existing systems, trading platforms, and workflow through our robust API.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 p-2 rounded-full mt-1">
                    <Icons.check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">White-Label Options</h4>
                    <p className="text-gray-600 text-sm">
                      Offer AI-powered predictions under your own brand with our comprehensive white-label solutions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 p-2 rounded-full mt-1">
                    <Icons.check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Revenue Sharing</h4>
                    <p className="text-gray-600 text-sm">
                      Partner with us and earn revenue through our B2B partnership programs and referral systems.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold mb-4">What Our Users Say</h3>
              <p className="text-blue-100 text-lg">
                Join thousands of successful traders using Probability Engine
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    JD
                  </div>
                  <div className="ml-3">
                    <h4 className="font-semibold">John Davis</h4>
                    <p className="text-blue-200 text-sm">Day Trader</p>
                  </div>
                </div>
                <p className="text-blue-100">
                  "Probability Engine has transformed my trading strategy. The 95% accuracy rate is no joke - I've seen my portfolio grow by 35% in just 3 months!"
                </p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-300">★</span>
                  ))}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    SM
                  </div>
                  <div className="ml-3">
                    <h4 className="font-semibold">Sarah Martinez</h4>
                    <p className="text-blue-200 text-sm">Portfolio Manager</p>
                  </div>
                </div>
                <p className="text-blue-100">
                  "The institutional-grade features and team collaboration tools have streamlined our entire investment process. Worth every penny!"
                </p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-300">★</span>
                  ))}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    RK
                  </div>
                  <div className="ml-3">
                    <h4 className="font-semibold">Robert Kim</h4>
                    <p className="text-blue-200 text-sm">Quant Developer</p>
                  </div>
                </div>
                <p className="text-blue-100">
                  "The API integration was seamless. We've built our entire trading system around Probability Engine's predictions. Game-changing technology!"
                </p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-300">★</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600 text-white rounded-2xl p-12 text-center space-y-6">
          <h2 className="text-4xl font-bold">Ready to Transform Your Trading?</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Join thousands of traders who are already using Probability Engine to make better decisions.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icons.activity className="h-6 w-6 text-blue-600" />
              <span className="font-semibold">Probability Engine</span>
            </div>
            <div className="text-sm text-gray-600">
              © 2024 Probability Engine. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}