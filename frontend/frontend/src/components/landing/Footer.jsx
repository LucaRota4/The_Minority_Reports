'use client';

import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  return (
    <motion.footer 
      className="relative w-full py-8 px-4 md:px-8 md:py-12 border-t border-muted/20 overflow-hidden"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-6 md:flex-row relative z-10">
        <motion.div 
          className="flex flex-col items-center gap-4 md:flex-row md:gap-2"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center space-x-2">
            <motion.img 
              src="/agora.svg" 
              alt="Agora Logo" 
              className="w-16 h-16"
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.2 }
              }}
            />
          </div>
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{' '}
            <motion.a
              href="https://github.com/ElioMargiotta"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4 hover:text-primary transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Elio Margiotta
            </motion.a>
            . The source code is available on{' '}
            <motion.a
              href="https://github.com/ElioMargiotta/agora_monorepo"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4 hover:text-primary transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              GitHub
            </motion.a>
            .
          </p>
        </motion.div>
        
        <motion.div 
          className="flex items-center space-x-6 text-sm"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <motion.a
            href="/app/docs"
            className="text-muted-foreground hover:text-primary transition-colors relative py-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Docs
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-primary"
              initial={{ width: 0 }}
              whileHover={{ width: "100%" }}
              transition={{ duration: 0.2 }}
            />
          </motion.a>
          <motion.a
            className="text-muted-foreground hover:text-primary transition-colors relative py-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Terms
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-primary"
              initial={{ width: 0 }}
              whileHover={{ width: "100%" }}
              transition={{ duration: 0.2 }}
            />
          </motion.a>
          <motion.a
            className="text-muted-foreground hover:text-primary transition-colors relative py-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Privacy
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-primary"
              initial={{ width: 0 }}
              whileHover={{ width: "100%" }}
              transition={{ duration: 0.2 }}
            />
          </motion.a>
          <motion.a
            className="text-muted-foreground hover:text-primary transition-colors relative py-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Risk Disclosure
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-primary"
              initial={{ width: 0 }}
              whileHover={{ width: "100%" }}
              transition={{ duration: 0.2 }}
            />
          </motion.a>
        </motion.div>
      </div>
      
      <motion.div 
        className="mt-8 text-center relative z-10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        viewport={{ once: true }}
      >
        <Separator className="mb-4" />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} AGORA Labs. All rights reserved. 
          <span className="block mt-1">
            Crypto derivatives are risky. Nothing here is financial advice. DYOR.
          </span>
        </p>
      </motion.div>
    </motion.footer>
  );
}
