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
        className="py-6 px-4 sm:py-8 sm:px-6 border-l-2 border-cyan-500/50 hover:border-cyan-400 transition-all duration-300"
        whileHover={{ x: 10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Animated background on hover */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
        
        {/* Content */}
        <div className="relative z-10">
          <motion.h3 
            className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-400 transition-colors duration-300 mb-2 sm:mb-3"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.2 + (index * 0.1) }}
          >
            {feature.title}
          </motion.h3>
          
          <motion.p 
            className="text-sm sm:text-base text-slate-300 group-hover:text-white transition-colors duration-300 leading-relaxed text-justify"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.4 + (index * 0.1) }}
          >
            {feature.description}
          </motion.p>
        </div>
        
        {/* Hover indicator */}
        <motion.div
          className="absolute left-0 top-0 w-1 h-full bg-cyan-400 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"
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
      title: 'Pure Anonymity',
      description:
        "Your vote is completely encrypted. No one can see how you voted, not even the game itself. Complete privacy from start to finish.",
    },
    {
      title: 'Zero Pressure',
      description:
        "With full anonymity, there's no fear of judgment or pressure. Vote for the unpopular answer without social consequences. True freedom of choice.",
    },
    {
      title: 'Sybil-Resistant',
      description:
        "Each player gets one vote regardless of resources or bots. The game is fair—no whale dominance, no fake accounts ruining the results.",
    },
    {
      title: 'A Mind Game',
      description:
        "Minority Report is a social experiment. Can you predict what others will avoid? It reveals hidden consensus, contrarian thinking, and collective psychology.",
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
            className="section-title text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white"
          >
            {"How to Play".split('').map((char, i) => (
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
            className="section-description max-w-3xl mx-auto text-base sm:text-lg md:text-xl leading-relaxed text-justify text-slate-300"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            The Minority Report is a voting game where the least popular answer wins. Cast your anonymous vote without revealing your choice. Since you never see live results, even bots can't coordinate attacks. No way to know where votes are going. No way to game the system. Fair, anonymous, and Sybil-resistant.
          </motion.p>
        </motion.div>
        
        {/* Subheading for problems solved */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-4">
            The Game Rules
          </h3>          <p className="text-slate-300 max-w-2xl mx-auto text-justify">
          </p>
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
