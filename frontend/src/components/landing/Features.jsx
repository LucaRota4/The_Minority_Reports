'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

function FeatureItem({ feature, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, threshold: 0.3 });

  return (
    <motion.div
      ref={ref}
      variants={itemVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className="group"
    >
      <motion.div 
        className="relative py-6 px-4 sm:py-8 sm:px-6 border-l-2 border-cyan-200 dark:border-cyan-800 hover:border-[#4D89B0] dark:hover:border-[#4D89B0] transition-all duration-300"
        whileHover={{ x: 10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Animated background on hover */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-[#4D89B0]/10 to-transparent dark:from-[#4D89B0]/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
        
        {/* Content */}
        <div className="relative z-10">
          <motion.h3 
            className="text-lg sm:text-xl font-bold text-foreground group-hover:text-[#4D89B0] dark:group-hover:text-[#4D89B0] transition-colors duration-300 mb-2 sm:mb-3"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.2 + (index * 0.1) }}
          >
            {feature.title}
          </motion.h3>
          
          <motion.p 
            className="text-sm sm:text-base text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.4 + (index * 0.1) }}
          >
            {feature.description}
          </motion.p>
        </div>
        
        {/* Hover indicator */}
        <motion.div
          className="absolute left-0 top-0 w-1 h-full bg-[#4D89B0] scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"
        />
      </motion.div>
    </motion.div>
  );
}

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, threshold: 0.1 });

  const features = [
    {
      title: 'FHE-Powered Governance',
      description:
        'Use Fully Homomorphic Encryption to run DAO logic on encrypted ballots and data—decisions stay public, votes stay private.',
    },
    {
      title: 'Kryptē Psêphos',
      description:
        'Cast anonymous votes with verifiable outcomes. Your identity and choice remain encrypted end-to-end.',
    },
    {
      title: 'Steemless Customization',
      description:
        'Choose voting parameters, privacy levels, and governance models that fit your community’s unique needs without sacrificing security.',
    },
    {
      title: 'Chainlink Proposal Automation',
      description:
        'Time-based proposal flows and upkeep powered by Chainlink for seamless, trustless execution of governance cycles.',
    },
  ];

  return (
    <section className="relative w-full px-4 py-16 sm:py-20 md:py-32 overflow-hidden" ref={ref}>
      {/* Background elements */}
      
      
      {/* Floating background shapes - Smaller on mobile */}
      <motion.div
        className="absolute -top-24 -left-24 w-48 h-48 md:w-96 md:h-96 rounded-full bg-cyan-400/5 blur-3xl"
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div
        className="absolute -bottom-24 -right-24 w-48 h-48 md:w-96 md:h-96 rounded-full bg-blue-400/5 blur-3xl"
        animate={{
          x: [0, -30, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="relative max-w-7xl mx-auto z-10">
        {/* Enhanced header with animated title */}
        <motion.div 
          className="text-center space-y-4 sm:space-y-6 mb-16 sm:mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          
          <motion.h2 
            className="section-title text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#4D89B0]"
          >
            {"Why Us ?".split('').map((char, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ delay: 0.3 + (i * 0.05), duration: 0.6 }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </motion.h2>
          
          <motion.p 
            className="section-description max-w-3xl mx-auto text-base sm:text-lg md:text-xl leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
          Step into Agora’s privacy-first DAO. With FHE, your vote stays hidden, your voice stays free, and collective decisions remain verifiable without sacrificing anonymity.
          </motion.p>
        </motion.div>
        
        {/* Clean list with staggered animation */}
        <motion.div 
          className="max-w-4xl mx-auto space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {features.map((feature, index) => (
            <FeatureItem key={index} feature={feature} index={index} />
          ))}
        </motion.div>

        {/* Call to action section */}
        <motion.div
          className="text-center mt-16 sm:mt-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >

        </motion.div>
      </div>
    </section>
  );
}
