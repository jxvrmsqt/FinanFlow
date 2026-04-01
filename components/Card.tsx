
import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'gradient';
}

const Card: React.FC<CardProps> = ({ title, children, className = "", icon, variant = 'default' }) => {
  return (
    <div className={`rounded-[1.5rem] p-6 transition-all duration-300 hover:shadow-lg ${variant === 'default' ? 'glass-card' : ''} ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-6">
          {icon && <span className={`${variant === 'gradient' ? 'text-white/80' : 'text-rose-500'}`}>{icon}</span>}
          {title && <h3 className={`text-xs font-bold uppercase tracking-wider ${variant === 'gradient' ? 'text-white/90' : 'text-gray-400'}`}>{title}</h3>}
        </div>
      )}
      <div className={variant === 'gradient' ? 'text-white' : ''}>{children}</div>
    </div>
  );
};

export default Card;
