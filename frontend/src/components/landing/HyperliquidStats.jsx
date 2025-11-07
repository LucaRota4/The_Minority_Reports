'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

function formatCurrency(amount) {
  if (amount >= 1e9) {
    return `$${(amount / 1e9).toFixed(2)}B`;
  } else if (amount >= 1e6) {
    return `$${(amount / 1e6).toFixed(2)}M`;
  }
  return `$${amount.toLocaleString()}`;
}

function CountUpAnimation({ end, duration = 2, suffix = '', prefix = '', isInView, formatter = null }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / (duration * 1000);

      if (progress < 1) {
        setCount(Math.floor(end * progress));
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, isInView]);

  const displayValue = formatter ? formatter(count) : `${prefix}${count.toLocaleString()}${suffix}`;
  
  return <span>{displayValue}</span>;
}

export function HyperliquidStats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, threshold: 0.3 });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const statVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const stats = [
    {
      value: 1000000,
      label: 'Encrypted Computations',
      description: 'FHE operations processed',
      formatter: (val) => val.toLocaleString(),
      icon: '�'
    },
    {
      value: 50000,
      label: 'Private Transactions',
      description: 'Processed with Zama FHE',
      formatter: (val) => val.toLocaleString(),
      icon: '�️'
    },
    {
      value: 99.9,
      suffix: '%',
      label: 'Privacy Guarantee',
      description: 'Data remains encrypted',
      icon: '🔒'
    }
  ];

  return (
    <section className="w-full px-4 py-16 md:py-24 relative overflow-hidden" ref={ref}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 via-blue-600/5 to-purple-600/5" />
      
      {/* Animated background shapes */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-400/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <motion.div 
        className="relative mx-auto max-w-7xl"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        <motion.div 
          className="text-center space-y-4 mb-16"
          variants={statVariants}
        >
          <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            FHE Privacy Metrics
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Real-time market data from the leading decentralized perpetuals exchange
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={statVariants}
              whileHover={{ 
                scale: 1.05,
                transition: { duration: 0.2 }
              }}
              className="text-center space-y-3 p-6 rounded-xl bg-background/50 backdrop-blur-sm border border-muted/50 hover:border-muted transition-all duration-300 relative overflow-hidden"
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              
              <motion.div 
                className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
                transition={{ 
                  delay: 0.3 + (index * 0.1),
                  duration: 0.6,
                  type: "spring",
                  stiffness: 100
                }}
              >
                <CountUpAnimation 
                  end={stat.value} 
                  suffix={stat.suffix || ''}
                  prefix={stat.prefix || ''}
                  formatter={stat.formatter}
                  isInView={isInView}
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ delay: 0.5 + (index * 0.1), duration: 0.4 }}
              >
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {stat.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {stat.description}
                </p>
              </motion.div>

              {/* Animated border effect */}
              <motion.div
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-600/20 to-blue-600/20 opacity-0"
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{ zIndex: -1 }}
              />
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          className="text-center mt-12"
          variants={statVariants}
        >
          <motion.div 
            className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-muted/50 backdrop-blur-sm border border-muted/50"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <motion.div 
                className="w-2 h-2 bg-green-500 rounded-full"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <span className="text-sm font-medium">Live FHE Metrics</span>
            </div>
            <div className="w-px h-4 bg-muted" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
