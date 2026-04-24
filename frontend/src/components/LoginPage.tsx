import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from "axios";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LoginPage(props: any) {
    // If we were sent here from the Confirm page, the state will contain email and password
    const location = useLocation();
    const isConfirm = location.state && location.state.email
    const defaultFormData = {email: location.state?.email || "", emailTouched: false,
                             password: location.state?.password || "", passwordTouched: false}
    const [formData, setFormData] = useState(defaultFormData);
    const [loginMessage, setLoginMessage] = useState("");
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageState, setPageState] = useState<"login" | "confirmed">("login")
    const [confirmedEmail, setConfirmedEmail] = useState("")

    const emailIsValid = formData.email.length > 0;
    const passwordIsValid = formData.password.length > 0;
    const loginIsDisabled = !emailIsValid || !passwordIsValid || isSubmitting;

    useEffect(() => {
    const channel = new BroadcastChannel("trackeats_auth");
    channel.onmessage = (event) => {
        if (event.data.type === "EMAIL_CONFIRMED") {
            const { email } = event.data;
            setConfirmedEmail(email)
            setPageState("confirmed")
        }
    };
    return () => channel.close(); // clean up on unmount
    }, []);

    const handleSubmit = async (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setLoginMessage("");
        setIsSubmitting(true);

        try {
            const response = await axios.post(
                "/api/login",
                { email: formData.email, password: formData.password },
                { timeout: 10000 }
            );
            props.storeTokenFunction(response.data.access_token);
            navigate("/foods")
        } catch (error) {
            console.log(error)
            if (axios.isAxiosError(error) && error.response)
                setLoginMessage(error.response.data.msg)
            else if (error instanceof Error)
                setLoginMessage(error.message)
            else
                setLoginMessage("Unable to log in right now.")
            setIsSubmitting(false);
        }
    }

    if (pageState === "confirmed") {
        return (
            <Box sx={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6">Your email has been confirmed, {confirmedEmail}.</Typography>
                <Typography variant="body2" color="text.secondary">You can close this tab.</Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                minHeight: '70vh',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)',
                py: { xs: 2, md: 4 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    mb: 3,
                    background: 'rgba(255,255,255,0.85)',
                    borderRadius: 3,
                    boxShadow: 3,
                    px: { xs: 2, md: 6 },
                    py: { xs: 2, md: 3 },
                    width: { xs: '98%', md: '90%' },
                    maxWidth: 900,
                    textAlign: 'left',
                }}
            >
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: 1, mb: 0.5 }}>
                    Login
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Please enter your email address and password to sign in
                </Typography>
            </Paper>
            <Paper
                elevation={4}
                sx={{
                    background: '#fff',
                    borderRadius: 3,
                    boxShadow: 6,
                    px: { xs: 2, md: 6 },
                    py: { xs: 2, md: 3 },
                    width: { xs: '98%', md: '95%' },
                    maxWidth: 600,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <form onSubmit={handleSubmit}>
                    <Box display="flex" flexDirection="column" gap={3}>
                        <TextField
                            label="Email Address"
                            variant="outlined"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prevState => ({...prevState, email: e.target.value}))}
                            required
                            autoFocus
                            disabled={isSubmitting}
                        />
                        <TextField
                            label="Password"
                            variant="outlined"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => setFormData(prevState => ({...prevState, password: e.target.value}))}
                            required
                            disabled={isSubmitting}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword((show) => !show)}
                                            edge="end"
                                            disabled={isSubmitting}
                                        >
                                            {showPassword ? <Visibility /> : <VisibilityOff />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        {isConfirm && (
                            <Box>
                                <Typography variant="body2" color="primary">Check your inbox for an email from Trackeats.</Typography>
                                <Typography variant="body2">Click on the link in that email (or paste it into a browser) to complete registration and activate your account. Then you will be able to log in.</Typography>
                            </Box>
                        )}
                        <Button variant="contained" color="primary" type="submit" disabled={loginIsDisabled} sx={{ height: 48 }}>
                            Login
                        </Button>
                        <Typography variant="body2">
                            Forgot your password? <RouterLink to="/reset_password_request">Reset it here</RouterLink>.
                        </Typography>
                        <Typography variant="body2">Not a TrackEats user yet? <RouterLink to="/register">Register here</RouterLink>.</Typography>
                        {loginMessage && (
                            <Typography className="errorText" color="error">{loginMessage}</Typography>
                        )}
                    </Box>
                </form>
            </Paper>
            <Backdrop
                open={isSubmitting}
                sx={(theme) => ({
                    color: '#fff',
                    zIndex: theme.zIndex.modal + 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                })}
            >
                <CircularProgress color="inherit" />
                <Typography variant="body1">Loading data...</Typography>
            </Backdrop>
        </Box>
    );
}

export default LoginPage;
