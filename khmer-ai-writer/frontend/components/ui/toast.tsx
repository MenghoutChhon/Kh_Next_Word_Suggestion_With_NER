'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Button } from './button';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastProps extends Toast {
  onRemove: (id: string) => void;
}

export function ToastComponent({ id, title, description, type, duration = 5000, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: 'bg-success/15 border-success/30 text-success',
    error: 'bg-error/15 border-error/30 text-error',
    warning: 'bg-warning/15 border-warning/30 text-warning',
    info: 'bg-primary/15 border-primary/30 text-primary',
  };

  const Icon = icons[type];

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${colors[type]} shadow-lg`}>
      <Icon className="size-5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm opacity-90 mt-1">{description}</p>}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(id)}
        className="h-6 w-6 p-0 hover:bg-card"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const toast = {
    success: (title: string, description?: string) => addToast({ title, description, type: 'success' }),
    error: (title: string, description?: string) => addToast({ title, description, type: 'error' }),
    warning: (title: string, description?: string) => addToast({ title, description, type: 'warning' }),
    info: (title: string, description?: string) => addToast({ title, description, type: 'info' }),
  };

  return { toasts, removeToast, toast };
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastComponent key={toast.id} {...toast} onRemove={removeToast} />
      ))}
    </div>
  );
}
