'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

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

const questions = [
  {
    id: 1,
    question: "Which cryptocurrency is the least known?",
    options: [
      { label: "Bitcoin", votes: 45 },
      { label: "Ethereum", votes: 32 },
      { label: "Solana", votes: 18 }
    ]
  }
];

function QuestionCard({ question, index }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const winner = submitted ? 
    question.options.reduce((min, opt) => opt.votes < min.votes ? opt : min) : 
    null;

  return (
    <motion.div
      variants={itemVariants}
      className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-cyan-500/30 shadow-lg shadow-cyan-500/20"
    >
      <h3 className="text-xl font-bold text-cyan-400 mb-6 text-center">
        {question.question}
      </h3>

      <div className="space-y-3 mb-6">
        {question.options.map((option, idx) => {
          const isWinner = winner?.label === option.label;
          const totalVotes = question.options.reduce((sum, opt) => sum + opt.votes, 0);
          const percentage = Math.round((option.votes / totalVotes) * 100);
          const isSelected = selectedOption === option.label;

          return (
            <motion.button
              key={idx}
              onClick={() => !submitted && setSelectedOption(option.label)}
              disabled={submitted}
              whileHover={!submitted ? { scale: 1.02 } : {}}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                isSelected && !submitted
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 hover:border-cyan-500/50'
              } ${
                isWinner
                  ? 'ring-2 ring-green-400'
                  : ''
              } ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-semibold ${
                  isWinner ? 'text-green-400' : 'text-cyan-300'
                }`}>
                  {option.label}
                  {isWinner && <span className="ml-2">👑 Winner (Least votes!)</span>}
                </span>
                <span className="text-sm text-slate-400">
                  {option.votes} votes
                </span>
              </div>
              
              <div className="w-full bg-slate-700 rounded-full h-2">
                <motion.div
                  className={`h-2 rounded-full ${
                    isWinner
                      ? 'bg-gradient-to-r from-green-400 to-green-500'
                      : 'bg-gradient-to-r from-cyan-400 to-cyan-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                {percentage}%
              </span>
            </motion.button>
          );
        })}
      </div>

      {!submitted ? (
        <motion.button
          onClick={() => setSubmitted(true)}
          disabled={!selectedOption}
          whileHover={{ scale: selectedOption ? 1.05 : 1 }}
          className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all"
        >
          Vote
        </motion.button>
      ) : (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 text-center">
          <p className="text-cyan-400 font-semibold">
            Vote submitted! The least popular answer wins. 🎯
          </p>
        </div>
      )}
    </motion.div>
  );
}

export function MajorityGame() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, threshold: 0.1 });

  return (
    <section className="relative w-full px-4 py-16 sm:py-20 md:py-32 overflow-hidden bg-gradient-to-b from-slate-900 to-black" ref={ref}>
      {/* Background shapes */}
      <motion.div
        className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl"
        animate={{
          x: [0, 30, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div
        className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-purple-400/10 blur-3xl"
        animate={{
          x: [0, -50, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="relative max-w-5xl mx-auto z-10">
        {/* Header */}
        <motion.div 
          className="text-center space-y-4 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
            Minority Game
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            The least popular answer wins. But how does voting stay secret while showing results?
          </p>
        </motion.div>

        {/* Game Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 gap-8 mb-12"
        >
          {questions.map((question, index) => (
            <QuestionCard key={question.id} question={question} index={index} />
          ))}
        </motion.div>

        {/* FHE Explanation */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-8 border border-cyan-500/30"
        >
          <h3 className="text-2xl font-bold text-cyan-400 mb-4">
            🔐 Why Anonymity is Sybil-Resistant
          </h3>
          <p className="text-slate-300 mb-4 leading-relaxed">
            To make this truly Sybil-resistant: require an NFT to participate. The creator distributes it to specific addresses—one vote per person, impossible to fake. This NFT could unlock endless possibilities: a contest spanning multiple questions, rewarding contrarian voters, or building a reputation system for those who consistently pick the minority.
          </p>
          <p className="text-slate-300 mb-4 leading-relaxed">
            One NFT = one real human. Anonymous vote. Fair competition. And since votes stay hidden, there's no way to coordinate. The system is bulletproof.
          </p>
          <p className="text-slate-300 font-semibold text-cyan-400">
            Real privacy. Real fairness. Infinite possibilities.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
