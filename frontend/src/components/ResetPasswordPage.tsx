import { useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import axios from "axios";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";

    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState(token ? "" : "Missing reset token in URL.");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmittedSuccessfully, setHasSubmittedSuccessfully] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const canSubmit = useMemo(
        () => token.length > 0 && password.trim().length > 0 && !isSubmitting && !hasSubmittedSuccessfully,
        [token, password, isSubmitting, hasSubmittedSuccessfully]
    );

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage("");
        setErrorMessage("");

        if (!token) {
            setErrorMessage("Missing reset token in URL.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.post(
                "/api/reset_password",
                {},
                { params: { token, password: password.trim() } }
            );
            setMessage(response.data?.msg ?? "Your password has been reset.");
            setHasSubmittedSuccessfully(true);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setErrorMessage(error.response?.data?.msg ?? error.message);
            } else {
                setErrorMessage("Could not reach the server. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "70vh",
                background: "linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)",
                py: { xs: 2, md: 4 },
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    mb: 3,
                    background: "rgba(255,255,255,0.85)",
                    borderRadius: 3,
                    boxShadow: 3,
                    px: { xs: 2, md: 6 },
                    py: { xs: 2, md: 3 },
                    width: { xs: "98%", md: "90%" },
                    maxWidth: 900,
                    textAlign: "left",
                }}
            >
                <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main", letterSpacing: 1, mb: 0.5 }}>
                    Set New Password
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Enter your new password and submit to complete the reset.
                </Typography>
            </Paper>

            <Paper
                elevation={4}
                sx={{
                    background: "#fff",
                    borderRadius: 3,
                    boxShadow: 6,
                    px: { xs: 2, md: 6 },
                    py: { xs: 2, md: 3 },
                    width: { xs: "98%", md: "95%" },
                    maxWidth: 600,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <form onSubmit={handleSubmit}>
                    <Box display="flex" flexDirection="column" gap={3}>
                        <TextField
                            label="New Password"
                            type={showPassword ? "text" : "password"}
                            variant="outlined"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoFocus
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword((show) => !show)}
                                            edge="end"
                                        >
                                            {showPassword ? <Visibility /> : <VisibilityOff />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            variant="contained"
                            color="primary"
                            type="submit"
                            disabled={!canSubmit}
                            sx={{ height: 48 }}
                        >
                            {isSubmitting ? "Submitting..." : "Reset Password"}
                        </Button>

                        <Typography variant="body2">
                            Back to <RouterLink to="/login">login</RouterLink>.
                        </Typography>

                        {message && <Typography color="success.main">{message}</Typography>}
                        {errorMessage && <Typography className="errorText" color="error">{errorMessage}</Typography>}
                    </Box>
                </form>
            </Paper>
        </Box>
    );
}
