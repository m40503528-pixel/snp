import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = '', delay = 0, hover = false, onClick }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={hover ? { scale: 1.02, y: -4 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/[0.03] backdrop-blur-xl
        border border-white/[0.08]
        shadow-[0_8px_32px_rgba(0,0,0,0.3)]
        before:absolute before:inset-0
        before:bg-gradient-to-br before:from-white/[0.05] before:to-transparent
        before:pointer-events-none
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
}

export function GlowButton({ 
  children, onClick, variant = 'primary', size = 'md', disabled, className = '', icon 
}: GlowButtonProps) {
  const variants = {
    primary: 'from-purple-600 to-blue-600 shadow-purple-500/25 hover:shadow-purple-500/40',
    secondary: 'from-gray-700 to-gray-800 shadow-gray-500/10 hover:shadow-gray-500/20 border border-white/10',
    danger: 'from-red-600 to-rose-600 shadow-red-500/25 hover:shadow-red-500/40',
    success: 'from-emerald-600 to-green-600 shadow-emerald-500/25 hover:shadow-emerald-500/40',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative inline-flex items-center justify-center font-medium
        rounded-xl text-white
        bg-gradient-to-r ${variants[variant]}
        shadow-lg transition-shadow duration-300
        disabled:opacity-40 disabled:cursor-not-allowed
        ${sizes[size]}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </motion.button>
  );
}

interface AnimatedInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  multiline?: boolean;
  rows?: number;
}

export function AnimatedInput({ 
  value, onChange, placeholder, type = 'text', icon, className = '', onKeyDown, multiline, rows = 4 
}: AnimatedInputProps) {
  const Component = multiline ? 'textarea' : 'input';
  
  return (
    <motion.div 
      className={`relative group ${className}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 text-gray-400 group-focus-within:text-purple-400 transition-colors z-10">
            {icon}
          </span>
        )}
        <Component
          type={type}
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={onKeyDown}
          rows={multiline ? rows : undefined}
          className={`
            w-full bg-white/[0.04] backdrop-blur-sm
            border border-white/[0.08] 
            rounded-xl text-white placeholder-gray-500
            focus:outline-none focus:border-purple-500/50
            transition-all duration-300
            ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3
            ${multiline ? 'resize-none' : ''}
          `}
        />
      </div>
    </motion.div>
  );
}

export function AnimatedContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08 } }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 15, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PulseOrb({ className = '', size = 'w-3 h-3' }: { className?: string; size?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className={`absolute inset-0 rounded-full bg-purple-500/30 animate-ping`} />
      <div className={`relative rounded-full bg-gradient-to-br from-purple-500 to-blue-600 ${size}`} />
    </div>
  );
}

export function AnimatedGradientBorder({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative group ${className}`}>
      <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-2xl opacity-20 group-hover:opacity-40 blur-sm transition-opacity duration-500" />
      <div className="relative bg-[#0a0a0f] rounded-2xl">
        {children}
      </div>
    </div>
  );
}

export function TypewriterText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.2 }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}
