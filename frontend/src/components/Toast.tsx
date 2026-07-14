import { useToast } from '@/contexts/ToastContext';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

export const Toast = () => {
    const { toasts, removeToast } = useToast();

    return (
        <>
            {toasts.map((toast) => (
                <Snackbar
                    key={toast.id}
                    open={true}
                    autoHideDuration={toast.severity === 'error' ? 7000 : 5000}
                    onClose={() => removeToast(toast.id)}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert onClose={() => removeToast(toast.id)} severity={toast.severity} sx={{ width: '100%' }}>
                        {toast.message}
                    </Alert>
                </Snackbar>
            ))}
        </>
    );
};
