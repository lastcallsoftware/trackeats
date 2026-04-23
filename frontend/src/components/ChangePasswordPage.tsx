import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import axios from "axios";
import { validatePassword } from "../utils/passwordValidation";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";

export default function ChangePasswordPage() {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmittedSuccessfully, setHasSubmittedSuccessfully] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);


    const passwordValidationMessage = validatePassword(newPassword);
    const passwordsMatch = useMemo(
        () => newPassword.length > 0 && newPassword === confirmNewPassword,
        [newPassword, confirmNewPassword]
    );

    const canSubmit = useMemo(
        () =>
            oldPassword.trim().length > 0 &&
            newPassword.trim().length > 0 &&
            passwordsMatch &&
            !passwordValidationMessage &&
            !isSubmitting &&
            !hasSubmittedSuccessfully,
        [oldPassword, newPassword, passwordsMatch, passwordValidationMessage, isSubmitting, hasSubmittedSuccessfully]
    );

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage("");
        setErrorMessage("");

        if (passwordValidationMessage) {
            setErrorMessage(passwordValidationMessage);
            return;
        }
        if (!passwordsMatch) {
            setErrorMessage("The new passwords do not match.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.post(
                "/api/change_password",
                {},
                {
                    params: {
                        old_password: oldPassword,
                        new_password: newPassword,
                    },
                }
            );
            setMessage(response.data?.msg ?? "Your password has been update.");
            setHasSubmittedSuccessfully(true);
            setOldPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setErrorMessage(error.response?.data?.msg ?? error.message);
            } else {
                setErrorMessage("Could not reach the server. Please try again.");
            }
        }
        setIsSubmitting(false);
    }

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
                    Change Password
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Enter your current password and choose a new one.
                </Typography>
            </Paper>

            {hasSubmittedSuccessfully ? (
                <Paper
                    elevation={4}
                    sx={{
                        background: "#fff",
                        borderRadius: 3,
                        boxShadow: 6,
                        px: { xs: 2, md: 6 },
                        py: { xs: 3, md: 4 },
                        width: { xs: "98%", md: "95%" },
                        maxWidth: 600,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 3,
                        textAlign: "center",
                    }}
                >
                    <Typography variant="h5" color="success.main" sx={{ fontWeight: 700 }}>
                        {message || "Your password has been reset."}
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        component={RouterLink}
                        to="/login"
                        sx={{ height: 48, minWidth: 180 }}
                    >
                        Go To Login
                    </Button>
                </Paper>
            ) : (
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
                                label="Current Password"
                                type={showOldPassword ? "text" : "password"}
                                variant="outlined"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                                autoFocus
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle current password visibility"
                                                onClick={() => setShowOldPassword((show) => !show)}
                                                edge="end"
                                            >
                                                {showOldPassword ? <Visibility /> : <VisibilityOff />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <TextField
                                label="New Password"
                                type={showNewPassword ? "text" : "password"}
                                variant="outlined"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                error={!!(passwordValidationMessage && newPassword.length > 0)}
                                helperText={newPassword.length > 0 ? passwordValidationMessage : " "}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle new password visibility"
                                                onClick={() => setShowNewPassword((show) => !show)}
                                                edge="end"
                                            >
                                                {showNewPassword ? <Visibility /> : <VisibilityOff />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <TextField
                                label="Confirm New Password"
                                type={showConfirmNewPassword ? "text" : "password"}
                                variant="outlined"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                required
                                error={confirmNewPassword.length > 0 && !passwordsMatch}
                                helperText={
                                    confirmNewPassword.length > 0 && !passwordsMatch
                                        ? "New passwords must match."
                                        : ""
                                }
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle confirm new password visibility"
                                                onClick={() => setShowConfirmNewPassword((show) => !show)}
                                                edge="end"
                                            >
                                                {showConfirmNewPassword ? <Visibility /> : <VisibilityOff />}
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
                                {isSubmitting ? "Submitting..." : "Change Password"}
                            </Button>

                            <Typography variant="body2">
                                Back to <RouterLink to="/foods">Foods</RouterLink>.
                            </Typography>
                            {errorMessage && <Typography className="errorText" color="error">{errorMessage}</Typography>}
                        </Box>
                    </form>
                </Paper>
            )}
        </Box>
    );
}
