import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';

type ErrorAlertProps = {
    message: string | null | undefined;
    onClose?: () => void;
    sx?: Record<string, unknown>;
};

function ErrorAlert({ message, onClose, sx }: ErrorAlertProps) {
    if (!message) {
        return null;
    }

    return (
        <Box sx={sx}>
            <Alert severity="error" variant="outlined" onClose={onClose}>
                {message}
            </Alert>
        </Box>
    );
}

export default ErrorAlert;