'use client';

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  const baseStyles = 'bg-surface-raised rounded-xl border border-border';
  const hoverStyles = hover
    ? 'hover:shadow-md hover:border-border-hover transition-all duration-200'
    : '';

  return (
    <div className={`${baseStyles} ${hoverStyles} p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function AnimatedCard({
  children,
  className = '',
  hover = true,
  ...motionProps
}: CardProps & Omit<HTMLMotionProps<'div'>, 'children'>) {
  return (
    <motion.div
      className={`bg-surface-raised rounded-xl border border-border p-6 ${hover ? 'cursor-pointer' : ''} ${className}`}
      whileHover={hover ? { y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
