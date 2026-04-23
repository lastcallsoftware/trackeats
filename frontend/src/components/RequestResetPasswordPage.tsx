import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import axios from "axios";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

export default function RequestResetPasswordPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmittedSuccessfully, setHasSubmittedSuccessfully] = useState(false);

    const emailIsValid = email.includes("@") && email.trim().length > 0;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage("");
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            const response = await axios.post(
                "/api/request_reset_password",
                {},
                { params: { email: email.trim() } }
            );
            setMessage(response.data?.msg ?? "If the given email address was registered, we tried to send a reset link to that address.");
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
                    Reset Password
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Enter the email address for your account and we will send a reset link.
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
                            label="Email Address"
                            type="email"
                            variant="outlined"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            type="submit"
                            disabled={!emailIsValid || isSubmitting || hasSubmittedSuccessfully}
                            sx={{ height: 48 }}
                        >
                            {isSubmitting ? "Submitting..." : "Send Reset Link"}
                        </Button>
                        <Typography variant="body2">
                            Remembered your password? <RouterLink to="/login">Return to login</RouterLink>.
                        </Typography>
                        {message && (
                            <Typography color="success.main">{message}</Typography>
                        )}
                        {errorMessage && (
                            <Typography className="errorText" color="error">{errorMessage}</Typography>
                        )}
                    </Box>
                </form>
            </Paper>
        </Box>
    );
}