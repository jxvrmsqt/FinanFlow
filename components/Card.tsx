import React from 'react';

interface CardProps {
  title: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, icon, className = '', children }) => {
  return (
    <div className={`rounded-[2rem] p-8 shadow-sm border border-gray-100 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-2xl font-black">{title}</h3>
        </div>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
};

export default Card;
