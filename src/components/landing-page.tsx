"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Shield, Brain, TestTube, GitBranch, BarChart, ArrowRight, CheckCircle, Star, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import Link from "next/link";
import type { Session } from "next-auth";

interface LandingPageProps {
  session: Session | null;
}

export function LandingPage({ session }: LandingPageProps) {
  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" });
  };

  const agents = [
    {
      id: 'knowledge-base',
      name: 'Knowledge Base Agent',
      description: 'Advanced document search, analysis, and retrieval with AI-powered insights',
      icon: Brain,
      color: 'teal',
      capabilities: ['Search', 'Analyze', 'Generate'],
      tier: 'Core',
      popular: true,
    },
    {
      id: 'business-rules',
      name: 'Business Rules Agent',
      description: 'Automated business logic validation, rule enforcement, and compliance checking',
      icon: Shield,
      color: 'navy',
      capabilities: ['Validate', 'Audit', 'Monitor'],
      tier: 'Core',
      popular: false,
    },
    {
      id: 'testing',
      name: 'Testing Agent',
      description: 'Automated testing, quality assurance, and performance validation',
      icon: TestTube,
      color: 'orange',
      capabilities: ['Validate', 'Analyze', 'Monitor'],
      tier: 'Extended',
      popular: false,
    },
    {
      id: 'workflow',
      name: 'Workflow Agent',
      description: 'Process automation, workflow orchestration, and task management',
      icon: GitBranch,
      color: 'teal',
      capabilities: ['Integrate', 'Transform', 'Monitor'],
      tier: 'Extended',
      popular: false,
    },
    {
      id: 'analytics',
      name: 'Analytics Agent',
      description: 'Advanced analytics, reporting, and business intelligence',
      icon: BarChart,
      color: 'orange',
      capabilities: ['Analyze', 'Generate', 'Monitor'],
      tier: 'Extended',
      popular: true,
    },
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      navy: 'bg-[#002C54]/10 text-[#002C54] border-[#002C54]/20',
      teal: 'bg-[#00B3B0]/10 text-[#00B3B0] border-[#00B3B0]/20',
      orange: 'bg-[#FF6B00]/10 text-[#FF6B00] border-[#FF6B00]/20',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.navy;
  };

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(to right, #F4F7FA, #FFFFFF)',
      fontFamily: 'Montserrat, "Open Sans", system-ui, sans-serif'
    }}>
      {/* Header */}
      <header className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* bancon Logo Placeholder */}
          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#002C54' }}>
            <div className="text-white font-bold text-lg">b</div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold" style={{ color: '#002C54' }}>bAxis</span>
            <span className="text-xs text-gray-500">by bancon</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggleButton />
          {session?.user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome back, {session.user.name}</span>
              <Button 
                asChild
                className="rounded-lg font-bold transition-all duration-200 hover:shadow-lg"
                style={{ 
                  backgroundColor: '#00B3B0',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#008F8C';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#00B3B0';
                }}
              >
                <Link href="/workspaces">My Workspaces</Link>
              </Button>
            </div>
          ) : (
            <>
              <Button 
                onClick={handleGoogleSignIn} 
                variant="outline"
                className="rounded-lg font-bold border-2 transition-all duration-200"
                style={{ 
                  borderColor: '#002C54',
                  color: '#002C54'
                }}
              >
                Sign In
              </Button>
              <Button 
                onClick={handleGoogleSignIn}
                className="rounded-lg font-bold transition-all duration-200 hover:shadow-lg"
                style={{ 
                  backgroundColor: '#002C54',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#001A35';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#002C54';
                }}
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight" style={{ color: '#002C54' }}>
            Welcome to
            <span className="block" style={{ color: '#00B3B0' }}>bAxis</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Smart agents for sharper execution. Automate testing, streamline finance, and accelerate business delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {session?.user ? (
              <>
                <Button 
                  size="lg" 
                  asChild 
                  className="text-lg px-8 py-6 rounded-xl font-bold transition-all duration-200 hover:shadow-xl"
                  style={{ 
                    backgroundColor: '#00B3B0',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#008F8C';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#00B3B0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Link href="/workspaces">
                    Enter bAxis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  asChild 
                  className="text-lg px-8 py-6 rounded-xl font-bold border-2 transition-all duration-200"
                  style={{ 
                    borderColor: '#FF6B00',
                    color: '#FF6B00'
                  }}
                >
                  <Link href="/create-tenant">Launch New Workspace</Link>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="lg" 
                  onClick={handleGoogleSignIn} 
                  className="text-lg px-8 py-6 rounded-xl font-bold transition-all duration-200 hover:shadow-xl"
                  style={{ 
                    backgroundColor: '#00B3B0',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#008F8C';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#00B3B0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Enter bAxis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={handleGoogleSignIn} 
                  className="text-lg px-8 py-6 rounded-xl font-bold border-2 transition-all duration-200"
                  style={{ 
                    borderColor: '#002C54',
                    color: '#002C54'
                  }}
                >
                  Sign In with Google
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" style={{ color: '#00B3B0' }} />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" style={{ color: '#00B3B0' }} />
              <span>Enterprise-grade security</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" style={{ color: '#00B3B0' }} />
              <span>14-day free trial</span>
            </div>
          </div>
        </div>
      </section>

      {/* Available AI Agents Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#002C54' }}>
            <span className="flex items-center justify-center gap-3">
              <Star className="h-8 w-8" style={{ color: '#FF6B00' }} />
              Available Smart Agents
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Intelligent automation for testing, finance, and business operations
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {agents.map((agent) => {
            const IconComponent = agent.icon;
            return (
              <Card 
                key={agent.id} 
                className={`relative transition-all duration-200 hover:shadow-xl hover:scale-105 border-2 rounded-xl ${
                  agent.popular ? 'shadow-lg' : ''
                }`}
                style={{
                  borderColor: agent.popular ? '#00B3B0' : '#E5E7EB'
                }}
              >
                {agent.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge 
                      className="px-4 py-1 rounded-full font-bold"
                      style={{ 
                        backgroundColor: '#FF6B00',
                        color: 'white'
                      }}
                    >
                      Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className={`h-16 w-16 rounded-xl flex items-center justify-center mb-4 mx-auto ${getColorClasses(agent.color)}`}>
                    <IconComponent className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl text-center" style={{ color: '#002C54' }}>{agent.name}</CardTitle>
                  <div className="flex justify-center">
                    <Badge 
                      variant="secondary" 
                      className="text-xs rounded-full"
                      style={{ 
                        backgroundColor: '#F3F4F6',
                        color: '#374151'
                      }}
                    >
                      {agent.tier}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm leading-relaxed text-center text-gray-600">
                    {agent.description}
                  </CardDescription>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm" style={{ color: '#002C54' }}>Capabilities:</h4>
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.map((capability) => (
                        <Badge 
                          key={capability} 
                          variant="outline" 
                          className="text-xs rounded-full border"
                          style={{ 
                            borderColor: '#00B3B0',
                            color: '#00B3B0'
                          }}
                        >
                          {capability}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-6">
            Access 5 smart agents for comprehensive business automation and optimization
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {session?.user ? (
              <Button 
                size="lg" 
                asChild 
                className="text-lg px-8 py-6 rounded-xl font-bold transition-all duration-200 hover:shadow-xl"
                style={{ 
                  backgroundColor: '#00B3B0',
                  color: 'white'
                }}
              >
                <Link href="/workspaces">
                  Access My Agents
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <Button 
                size="lg" 
                onClick={handleGoogleSignIn} 
                className="text-lg px-8 py-6 rounded-xl font-bold transition-all duration-200 hover:shadow-xl"
                style={{ 
                  backgroundColor: '#00B3B0',
                  color: 'white'
                }}
              >
                Access All Agents
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#002C54' }}>
            Agent Access Tiers
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the right plan for your team's automation needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Core Agents */}
          <Card className="border-2 rounded-xl" style={{ borderColor: '#E5E7EB' }}>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl" style={{ color: '#002C54' }}>Core Agents</CardTitle>
              <CardDescription className="text-gray-600">Essential automation for every workspace</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold" style={{ color: '#00B3B0' }}>Free</span>
                <span className="text-gray-500">/14 days</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5" style={{ color: '#00B3B0' }} />
                  <span>Knowledge Base Agent</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5" style={{ color: '#00B3B0' }} />
                  <span>Business Rules Agent</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5" style={{ color: '#00B3B0' }} />
                  <span>Basic workspace access</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5" style={{ color: '#00B3B0' }} />
                  <span>Standard security</span>
                </div>
              </div>
              {session?.user ? (
                <Button 
                  asChild 
                  className="w-full mt-6 rounded-lg font-bold"
                  style={{ 
                    backgroundColor: '#002C54',
                    color: 'white'
                  }}
                >
                  <Link href="/create-tenant">Launch New Workspace</Link>
                </Button>
              ) : (
                <Button 
                  onClick={handleGoogleSignIn} 
                  className="w-full mt-6 rounded-lg font-bold"
                  style={{ 
                    backgroundColor: '#002C54',
                    color: 'white'
                  }}
                >
                  Start Free Trial
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Extended Agents */}
          <Card className="border-2 rounded-xl shadow-lg" style={{ borderColor: '#00B3B0' }}>
            <CardHeader className="text-center pb-8">
              <Badge 
                className="mb-4 rounded-full font-bold"
                style={{ 
                  backgroundColor: '#FF6B00',
                  color: 'white'
                }}
              >
                Recommended
              </Badge>
              <CardTitle className="text-2xl" style={{ color: '#002C54' }}>Extended Agents</CardTitle>
              <CardDescription className="text-gray-600">Full automation suite with advanced capabilities</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold" style={{ color: '#002C54' }}>Enterprise</span>
                <span className="text-gray-500">/contact sales</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5" style={{ color: '#00B3B0' }} />
                  <span>All Core Agents</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5" style={{ color: '#00B3B0' }} />
                  <span>Testing Agent</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5" style={{ color: '#00B3B0' }} />
                  <span>Workflow Agent</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5" style={{ color: '#00B3B0' }} />
                  <span>Analytics Agent</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5" style={{ color: '#00B3B0' }} />
                  <span>Advanced security & compliance</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5" style={{ color: '#00B3B0' }} />
                  <span>Priority support</span>
                </div>
              </div>
              {session?.user ? (
                <Button 
                  asChild 
                  className="w-full mt-6 rounded-lg font-bold"
                  style={{ 
                    backgroundColor: '#00B3B0',
                    color: 'white'
                  }}
                >
                  <Link href="/create-tenant">Get Started</Link>
                </Button>
              ) : (
                <Button 
                  onClick={handleGoogleSignIn} 
                  className="w-full mt-6 rounded-lg font-bold"
                  style={{ 
                    backgroundColor: '#00B3B0',
                    color: 'white'
                  }}
                >
                  Get Started
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="rounded-2xl p-12 text-center border" style={{ 
          backgroundColor: 'rgba(0, 179, 176, 0.05)',
          borderColor: 'rgba(0, 179, 176, 0.1)'
        }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#002C54' }}>
            Ready to Transform Your Operations?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of organizations using bAxis to automate processes, 
            accelerate testing, and optimize business delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>Trusted by 2,000+ organizations</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              {session?.user ? (
                <>
                  <Button 
                    size="lg" 
                    asChild 
                    className="text-lg px-8 py-6 rounded-xl font-bold transition-all duration-200 hover:shadow-xl"
                    style={{ 
                      backgroundColor: '#00B3B0',
                      color: 'white'
                    }}
                  >
                    <Link href="/workspaces">
                      Enter bAxis
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    onClick={handleGoogleSignIn} 
                    className="text-lg px-8 py-6 rounded-xl font-bold transition-all duration-200 hover:shadow-xl"
                    style={{ 
                      backgroundColor: '#00B3B0',
                      color: 'white'
                    }}
                  >
                    Enter bAxis Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={handleGoogleSignIn} 
                    className="text-lg px-8 py-6 rounded-xl font-bold border-2"
                    style={{ 
                      borderColor: '#002C54',
                      color: '#002C54'
                    }}
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#002C54' }}>
              <div className="text-white font-bold text-sm">b</div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold" style={{ color: '#002C54' }}>bAxis</span>
              <span className="text-xs text-gray-500">by bancon</span>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1">
            <p className="text-sm text-gray-500">
              © 2024 bAxis. Smart automation for business excellence.
            </p>
            <p className="text-xs text-gray-400">
              Part of the bancon Innovation Hub
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 