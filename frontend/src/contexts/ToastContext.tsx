import { useCallback, useState, type ReactNode } from 'react';
import { ToastContext, type Toast, type ToastSeverity } from './toastContext';

export { type ToastSeverity } from './toastContext';

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, severity: ToastSeverity = 'info', durationMs?: number) => {
        const id = Date.now().toString();
        const toast: Toast = { id, message, severity };

        setToasts((prev) => [...prev, toast]);

        // Error toasts persist until dismissed; non-error toasts auto-hide.
        let effectiveDurationMs = durationMs;
        if (effectiveDurationMs === undefined) {
            effectiveDurationMs = severity === 'error' ? 0 : 5000;
        }

        if (effectiveDurationMs > 0) {
            setTimeout(() => {
                removeToast(id);
            }, effectiveDurationMs);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
            {children}
        </ToastContext.Provider>
    );
};