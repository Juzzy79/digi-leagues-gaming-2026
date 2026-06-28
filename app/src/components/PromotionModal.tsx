// src/components/PromotionModal.tsx
import { motion } from 'framer-motion'
import { ShieldAlert, ChevronUp } from 'lucide-react'
import Button from './Button'
import { useEffect } from 'react'
import { soundEngine } from '../utils/SoundEngine'

interface PromotionModalProps {
  newTierName: string
  onClose: () => void
}

export default function PromotionModal({ newTierName, onClose }: PromotionModalProps) {
  useEffect(() => {
    soundEngine.playPromotion();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.5, 1.2], opacity: [0, 0.5, 0.2] }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="w-[800px] h-[800px] bg-pulse-500/20 rounded-full blur-[100px]"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        className="relative bg-steel-950 border border-pulse-500 shadow-[0_0_50px_rgba(20,184,166,0.3)] rounded-lg p-12 text-center max-w-2xl w-full z-10"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-32 h-32 mx-auto bg-pulse-900/30 border-2 border-pulse-500 flex items-center justify-center rounded-lg shadow-[0_0_30px_rgba(20,184,166,0.5)] mb-8 transform -rotate-12"
        >
          <ShieldAlert size={64} className="text-pulse-400" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-pulse-500 font-mono text-sm uppercase tracking-[0.3em] font-bold mb-2 flex items-center justify-center gap-2">
            <ChevronUp size={16} /> Rank Promotion Authorized <ChevronUp size={16} />
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-ink-100 uppercase italic tracking-tighter mb-4 drop-shadow-md">
            {newTierName}
          </h1>
          <p className="text-ink-400 font-body max-w-md mx-auto mb-10 leading-relaxed">
            Your Universal Skill Rating has surpassed the threshold. You have been promoted to the {newTierName} tier. 
            The network has been notified of your ascension.
          </p>

          <Button 
            variant="primary" 
            size="lg" 
            onClick={onClose}
            className="px-12 py-4 text-lg font-black tracking-widest shadow-[0_0_20px_rgba(20,184,166,0.4)]"
          >
            ACKNOWLEDGE
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
