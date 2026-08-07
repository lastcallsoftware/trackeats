import { createContext } from 'react';

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    message: string;
    severity: ToastSeverity;
}

export interface ToastContextType {
    toasts: Toast[];
    showToast: (message: string, severity?: ToastSeverity, durationMs?: number) => void;
    removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
