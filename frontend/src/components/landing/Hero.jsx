'use client';

import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useState, useEffect, useRef } from 'react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5 }
};

export function Hero() {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Scroll-triggered animations
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax transforms
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const shapesY = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);

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
        setMousePosition({ x: x * 50, y: y * 50 });
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
    <section 
      ref={containerRef}
      className={`relative w-full min-h-screen flex items-center justify-center overflow-hidden ${isLight ? 'hero-light-theme' : ''}`}
    >
      {/* Dynamic background with parallax */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-0 w-full h-[120%]"
      >
        
      </motion.div>

      {/* Floating geometric shapes with mouse interaction */}
      <motion.div
        style={{ 
          y: shapesY,
          x: useTransform(mouseXSpring, [-50, 50], [-30, 30]),
          rotateZ: useTransform(mouseXSpring, [-50, 50], [-5, 5])
        }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* Large floating shapes - Reduced size on mobile */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-32 h-32 md:w-72 md:h-72 rounded-full"
          style={{
            background: isLight 
              ? "linear-gradient(135deg, rgba(77, 137, 176, 0.1), rgba(77, 137, 176, 0.1))"
              : "linear-gradient(135deg, rgba(77, 137, 176, 0.2), rgba(77, 137, 176, 0.2))",
            filter: "blur(60px)",
          }}
          animate={{
            y: [-20, 20, -20],
            rotate: [-5, 5, -5],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 md:w-96 md:h-96 rounded-full"
          style={{
            background: isLight 
              ? "linear-gradient(225deg, rgba(77, 137, 176, 0.08), rgba(77, 137, 176, 0.08))"
              : "linear-gradient(225deg, rgba(77, 137, 176, 0.15), rgba(77, 137, 176, 0.15))",
            filter: "blur(80px)",
          }}
          animate={{
            y: [30, -30, 30],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Smaller decorative elements */}
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-2 h-2 rounded-full opacity-40 ${
              isLight 
                ? 'bg-gradient-to-r from-[#4D89B0] to-[#7ba8c4]' 
                : 'bg-gradient-to-r from-[#4D89B0] to-[#7ba8c4]'
            }`}
            style={{
              left: `${30 + (i * 10)}%`,
              top: `${15 + (i * 8)}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.4, 0.8, 0.4],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3 + (i * 0.5),
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2
            }}
          />
        ))}
      </motion.div>

      {/* Main content with parallax */}
      <motion.div 
        style={{ y: textY }}
        className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 text-center"
      >
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-8 sm:space-y-12"
        >
          {/* Kinetic typography */}
          <motion.div variants={fadeInUp} className="space-y-6 sm:space-y-8">
            {/* Animated tagline */}
            <motion.p 
              className={`text-xs sm:text-sm md:text-base font-mono tracking-[0.15em] sm:tracking-[0.2em] uppercase font-medium ${
                isLight ? 'text-slate-800' : 'text-[#4D89B0]'
              }`}
            >
              {['K', 'r', 'y', 'p', 't', 'ē', ' ', 'p', 's', 'ê', 'p', 'h', 'o', 's', ' ', '—', ' ', 'p', 'a', 'r', 'r', 'h', 'e', 's', 'í', 'a', ' ', 'd', 'i', 'a', 't', 'ē', 'r', 'o', 'u', 'm', 'é', 'n', 'ē'].map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="inline-block"
                >
                  {char === ' ' ? '\u00A0' : char}
                </motion.span>
              ))}
            </motion.p>

            {/* Main title with word-by-word animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mb-6"
            >
              <img 
                src="/agora.svg" 
                alt="Agora Logo" 
                className="w-48 h-48 md:w-64 md:h-64 mx-auto"
              />
            </motion.div>
            <motion.h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold leading-tight">
              {["A G O R A"].map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 100, rotateX: -90 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    rotateX: 0,
                    transition: {
                      duration: 0.8,
                      delay: i * 0.1,
                      ease: [0.6, -0.05, 0.01, 0.99]
                    }
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    transition: { duration: 0.3 }
                  }}
                  className={`inline-block ${
                    isLight 
                      ? "text-slate-900" 
                      : "text-[#4D89B0]"
                  }`}
                >
                  {word}
                </motion.span>
              ))}
            </motion.h1>

    
          </motion.div>

          {/* CTA Buttons */}
          <motion.div 
            className="flex items-center justify-center px-4"
            variants={scaleIn}
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Button 
                size="sm" 
                asChild 
                className={`relative overflow-hidden font-semibold text-sm px-6 py-3 h-auto uppercase tracking-wider shadow-lg w-auto border-2 transition-all duration-300 ${
                  isLight 
                    ? 'bg-transparent border-slate-900/50 text-slate-900 hover:bg-slate-900/10' 
                    : 'bg-transparent border-white/50 text-white hover:bg-white/10'
                }`}
              >
                <a href="/app">
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    initial={{ x: "-100%", skewX: -15 }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.8 }}
                  />
                  <span className="relative z-10">Enter The Agora</span>
                </a>
              </Button>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="flex justify-center mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.8 }}
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={`w-6 h-10 border-2 rounded-full flex justify-center ${
                isLight ? 'border-slate-500/60' : 'border-[#4D89B0]/60'
              }`}
            >
              <motion.div
                animate={{ y: [0, 12, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className={`w-1 h-3 rounded-full mt-2 ${
                  isLight ? 'bg-slate-600' : 'bg-[#4D89B0]'
                }`}
              />
            </motion.div>
          </motion.div>

          </motion.div>
      </motion.div>
    </section>
  );
}
