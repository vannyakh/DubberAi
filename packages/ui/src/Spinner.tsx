import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@dubbercut/utils';

export const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <Loader2 size={size} className={cn('animate-spin', className)} />
);
