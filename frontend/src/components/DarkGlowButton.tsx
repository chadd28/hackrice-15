import React from 'react';
import { motion } from 'framer-motion';

interface DarkGlowButtonProps {
  to: string;
  text: string;
  icon?: React.ReactNode;
  width?: string;
  height?: string;
  onClick?: () => void;
}

/**
 * DarkGlowButton - A stylish button with a dark background and gradient glow effect
 */
const DarkGlowButton: React.FC<DarkGlowButtonProps> = ({ 
  to, 
  text, 
  icon, 
  width = 'auto', 
  height = 'auto',
  onClick
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      viewport={{ once: true }}
      className="relative"
      style={{ width, height }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Gradient glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg blur opacity-75 group-hover:opacity-90 transition duration-200"></div>
      
      {/* Button content */}
      <a 
        href={to} 
        onClick={onClick}
        className="relative flex items-center justify-between bg-slate-900 py-3 px-6 rounded-lg text-white font-medium hover:bg-slate-800 transition-all duration-200 w-full h-full"
      >
        <span className="mr-3">{text}</span>
        {icon ? (
          icon
        ) : (
          <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        )}
      </a>
    </motion.div>
  );
};

export default DarkGlowButton;
