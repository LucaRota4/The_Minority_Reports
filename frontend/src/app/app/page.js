"use client";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useState, useEffect, useRef } from 'react';
import {
  Gamepad2,
  Shield,
  Zap,
  ArrowUpRight,
  ChevronRight,
  Lock,
  Users,
  Clock,
  Sparkles,
  LayoutDashboard
} from 'lucide-react';

// Dashboard overview page - optimized for Base Mini App guidelines
export default function DashboardPage() {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Mouse parallax effects
  const mouseXSpring = useSpring(mousePosition.x, { stiffness: 500, damping: 50 });
  const mouseYSpring = useSpring(mousePosition.y, { stiffness: 500, damping: 50 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mouse movement tracking for parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        setMousePosition({ x: x * 30, y: y * 30 });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isLight = mounted && currentTheme === 'light';

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden"
    >
      {/* Animated background shapes */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          x: useTransform(mouseXSpring, [-30, 30], [-20, 20]),
          y: useTransform(mouseYSpring, [-30, 30], [-20, 20])
        }}
      >
        {/* Large floating shapes */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-32 h-32 md:w-64 md:h-64 rounded-full"
          style={{
            background: isLight
              ? "linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08))"
              : "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))",
            filter: "blur(40px)",
          }}
          animate={{
            y: [-15, 15, -15],
            rotate: [-3, 3, -3],
            scale: [1, 1.03, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <motion.div
          className="absolute bottom-1/4 right-1/4 w-40 h-40 md:w-80 md:h-80 rounded-full"
          style={{
            background: isLight
              ? "linear-gradient(225deg, rgba(139, 92, 246, 0.06), rgba(59, 130, 246, 0.06))"
              : "linear-gradient(225deg, rgba(139, 92, 246, 0.12), rgba(59, 130, 246, 0.12))",
            filter: "blur(50px)",
          }}
          animate={{
            y: [20, -20, 20],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Smaller decorative elements */}
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1.5 h-1.5 rounded-full opacity-30 ${
              isLight
                ? 'bg-gradient-to-r from-blue-300 to-purple-300'
                : 'bg-gradient-to-r from-blue-400 to-purple-400'
            }`}
            style={{
              left: `${25 + (i * 12)}%`,
              top: `${20 + (i * 10)}%`,
            }}
            animate={{
              y: [0, -15, 0],
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4 + (i * 0.3),
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3
            }}
          />
        ))}
      </motion.div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="h-10 w-10 text-purple-600" />
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
              ZamaHub Dashboard
            </h1>
          </div>
          <p className="text-xl font-semibold text-muted-foreground max-w-2xl mx-auto mb-6">
            Explore privacy-preserving applications powered by Zama&apos;s FHE technology
          </p>
          
          {/* Quick Navigation */}
          <div className="flex items-center justify-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              className="bg-primary/5 border-primary/20 hover:bg-primary/10"
              disabled
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <a href="/app/zama-game">
                <Gamepad2 className="h-4 w-4 mr-2" />
                Zama Game
              </a>
            </Button>
          </div>
        </motion.div>

        {/* Available Apps - Mobile optimized grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        >
          <Card className="border-2 hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Gamepad2 className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Zama Game</h3>
                  <p className="text-sm text-muted-foreground">Privacy-Preserving Voting</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Experience fully homomorphic encryption in action with secure, private voting games.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>FHE Encrypted</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>Multi-Player</span>
                </div>
              </div>
              <Button size="sm" className="w-full" asChild>
                <a href="/app/zama-game">
                  <span>Play Now</span>
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 opacity-60">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Lock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Private DeFi</h3>
                  <p className="text-sm text-muted-foreground">Confidential Trading</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Trade cryptocurrencies with complete privacy. Your positions and balances stay encrypted.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>FHE Protected</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  <span>Fast Execution</span>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full" disabled>
                <span>Coming Soon</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 opacity-60 md:col-span-2 lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Automated Vaults</h3>
                  <p className="text-sm text-muted-foreground">Smart Yield Farming</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Automated yield strategies with privacy-preserving rebalancing and harvesting.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>FHE Secured</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  <span>Chainlink Automation</span>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full" disabled>
                <span>Coming Soon</span>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions - App-focused CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Choose an application to explore privacy-preserving technology
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  size="lg"
                  className="w-full justify-between"
                  asChild
                >
                  <a href="/app/zama-game">
                    <span>Try Zama Game</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full justify-between"
                  asChild
                >
                  <a href="/docs">
                    <span>Learn About FHE</span>
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Platform Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Why ZamaHub?</CardTitle>
              <CardDescription>
                Discover the power of privacy-preserving computation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Privacy First</h3>
                    <p className="text-sm text-muted-foreground">
                      All computations happen on encrypted data, ensuring your information stays private.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Developer Friendly</h3>
                    <p className="text-sm text-muted-foreground">
                      Easy-to-use APIs and SDKs for integrating FHE into your applications.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Gamepad2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Real Applications</h3>
                    <p className="text-sm text-muted-foreground">
                      Experience FHE through interactive games and practical use cases.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
