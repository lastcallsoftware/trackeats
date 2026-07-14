import { createContext, useContext, useCallback, useState, ReactNode } from 'react';

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    severity: ToastSeverity;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (message: string, severity?: ToastSeverity, durationMs?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, severity: ToastSeverity = 'info', durationMs: number = 5000) => {
        const id = Date.now().toString();
        const toast: Toast = { id, message, severity };

        setToasts((prev) => [...prev, toast]);

        if (durationMs > 0) {
            setTimeout(() => {
                removeToast(id);
            }, durationMs);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};
