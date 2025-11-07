'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const testimonials = [
  {
    name: "Dr. Alice Chen",
    role: "Cryptography Researcher",
    avatar: "AC",
    content: "Zama's FHE implementation is groundbreaking. The ability to perform computations on encrypted data without decryption opens up incredible possibilities for privacy-preserving DeFi.",
    rating: 5
  },
  {
    name: "Sarah Williams",
    role: "Blockchain Developer",
    avatar: "SW",
    content: "The Zama Game demonstrates how FHE can create truly private voting systems. As a developer, I'm excited to see what other applications this technology enables.",
    rating: 5
  },
  {
    name: "Marcus Rodriguez",
    role: "Privacy Advocate",
    avatar: "MR",
    content: "Finally, a blockchain platform that takes privacy seriously. ZamaHub's integration of FHE with Chainlink automation shows the future of secure, decentralized applications.",
    rating: 5
  },
  {
    name: "Emma Thompson",
    role: "DeFi User",
    avatar: "ET",
    content: "The Zama Game is intuitive and fun, but more importantly, it shows how privacy can be maintained in blockchain applications. This is the kind of innovation we need.",
    rating: 5
  },
  {
    name: "David Kim",
    role: "Smart Contract Auditor",
    avatar: "DK",
    content: "Zama's approach to FHE in smart contracts is both elegant and secure. The Chainlink integration for automation adds another layer of trust and reliability.",
    rating: 5
  },
  {
    name: "Lisa Park",
    role: "Crypto Entrepreneur",
    avatar: "LP",
    content: "ZamaHub is pioneering the next generation of blockchain applications. The combination of FHE privacy with automated execution via Chainlink is truly innovative.",
    rating: 5
  }
];

const StarIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

export function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, threshold: 0.1 });

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

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <section className="w-full px-4 py-16 md:py-24 bg-muted/30" ref={ref}>
      <motion.div 
        className="mx-auto max-w-7xl"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        <motion.div 
          className="text-center space-y-4 mb-16"
          variants={cardVariants}
        >
          <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
            Community Voices
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Hear from developers, researchers, and privacy advocates exploring the future of FHE-powered applications
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              variants={cardVariants}
              whileHover={{ 
                y: -5,
                transition: { duration: 0.2 }
              }}
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 border-muted/50 bg-background/50 backdrop-blur-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                        transition={{ 
                          delay: 0.5 + (index * 0.1) + (i * 0.05),
                          type: "spring",
                          stiffness: 200,
                          damping: 10
                        }}
                      >
                        <StarIcon className="text-yellow-400" />
                      </motion.div>
                    ))}
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  
                  <div className="flex items-center gap-3 pt-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={testimonial.image} alt={testimonial.name} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {testimonial.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          className="text-center mt-12"
          variants={cardVariants}
        >
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <div className="flex -space-x-2">
              {testimonials.slice(0, 4).map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ scale: 0 }}
                  animate={isInView ? { scale: 1 } : { scale: 0 }}
                  transition={{ delay: 1 + (index * 0.1) }}
                >
                  <Avatar className="w-8 h-8 border-2 border-background">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
              ))}
            </div>
            <span className="text-sm">+2,500 happy traders</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
