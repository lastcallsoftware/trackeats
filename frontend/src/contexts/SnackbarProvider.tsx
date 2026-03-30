import { Alert, Snackbar } from "@mui/material";
import { createContext, memo, useCallback, useState } from "react";

interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "warning" | "info";
  key: number;
}

interface SnackbarContextType {
  showSnackbar: (message: string, severity: "success" | "error" | "warning" | "info") => void;
}

const SnackbarContext = createContext<SnackbarContextType | null>(null);

const AppSnackbar = memo(({ open, message, severity, snackbarKey, onClose }: {
  open: boolean;
  message: string;
  severity: "success" | "error" | "warning" | "info";
  snackbarKey: number;
  onClose: () => void;
}) => (
  <Snackbar
    key={snackbarKey}
    open={open}
    autoHideDuration={null}
    onClose={(_, reason) => {
      if (reason === "clickaway") return;
      onClose();
    }}
    anchorOrigin={{ vertical: "top", horizontal: "center" }}
  >
    <Alert severity={severity} onClose={onClose} sx={{ width: "100%" }}>
      {message}
    </Alert>
  </Snackbar>
));

export const SnackbarProvider = ({ children }: { children: React.ReactNode }) => {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
    key: 0,
  });

  const showSnackbar = useCallback((message: string, severity: "success" | "error" | "warning" | "info") => {
    setSnackbar({ open: true, message, severity, key: Date.now() });
  }, []);

  const handleClose = useCallback(() => {
    setSnackbar(s => ({ ...s, open: false }));
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        snackbarKey={snackbar.key}
        onClose={handleClose}
      />
    </SnackbarContext.Provider>
  );
};

export default SnackbarContext;