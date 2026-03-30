import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import {
    Paper,
    Typography,
    TextField,
    Button,
    Divider,
    Box,
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

function RegisterPage() {
    const defaultFormData = {username: "", usernameTouched: false, usernameMessage: "",
                             password: "", passwordTouched: false, passwordMessage: "",
                             password2: "", password2Touched: false, password2Message: "",
                             email: "", emailTouched: false, emailMessage: "",
                             seed_requested: true}
    const [formData, setFormData] = useState(defaultFormData);
    const [registrationMessage, setRegistrationMessage] = useState("");
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);

    const usernameChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
        const username = e.target.value;
        let msg = "";
        if (username.length == 0) {
            msg = "Username is required"
        }
        else if (username.length < 3) {
            msg = "Username must be at least 3 characters";
        }
        setFormData(prevState => ({...prevState, username: username, usernameMessage: msg}))
    }

    const passwordChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
        const specialCharsRegex = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
        const password = e.target.value;
        let msg = ""
        if (password.length == 0) {
            msg = "Password is required"
        }
        else if (password.length < 8) {
            msg = "Password must be at least 8 characters";
        }
        else if (!password.match(/[a-z]/)) {
            msg = "Password must contain at least one lower-case character";
        }
        else if (!password.match(/[A-Z]/)) {
            msg = "Password must contain at least one upper-case character";
        }
        else if (!password.match(/[0-9]/)) {
            msg = "Password must contain at least one numeric character";
        }
        else if (!password.match(specialCharsRegex)) {
            msg = "Password must contain at least one special character";
        }
        setFormData(prevState => ({...prevState, password: password, passwordMessage: msg}))
    }

    const password2Changed = (e: React.ChangeEvent<HTMLInputElement>) => {
        const password2 = e.target.value;
        let msg = ""
        if (!(formData.password === password2)) {
            msg = "Passwords do not match";
        }
        setFormData(prevState => ({...prevState, password2: password2, password2Message: msg}))
    }

    const emailChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
        const email = e.target.value;
        let msg = ""
        if (email.length == 0) {
            msg = "Email address is required"
        }
        else if (!email.includes("@")) {
            msg = "The email address must contain exactly one @ character";
        }
        else {
            // I gave up trying to validate email addresses on the front end.
            // There are StackOverflow posts with insanely complicated regexes,
            // but what's the point?  If you use a regex to detect an invalid 
            // address, you can't even tell the user what's wrong with it, just
            // that it's invalid.  Besides, the real experts on the subject seem
            // to think that it isn't even possible to do a fully reliable check
            // using only regular expressions.
            // So just checking the address length and the presence of the @ 
            // character is good enough here.  Let the back end do the rest.
            const atindex = email.indexOf("@")
            const prefix = email.substring(0, atindex)
            const domain = email.substring(atindex+1)
            if (domain.includes("@")) {
                msg = "The email address must contain exactly one @ character"
            }
            else if (prefix.length < 1) {
                msg = "The part before the @ must be at least 1 character"
            }
            else if (prefix.length > 64) {
                msg = "The part before the @ must be at most 64 characters"
            }
            else if (domain.length < 2) {
                msg = "The part after the @ must be at least 2 characters"
            }
            else if (domain.length > 255) {
                msg = "The part after the @ must be at most 255 characters"
            }
        }
        setFormData(prevState => ({...prevState, email: email, emailMessage: msg}))
    }

    const registerIsDisabled = formData.username.length == 0 ||
                               formData.usernameMessage.length > 0 ||
                               formData.password.length == 0 ||
                               formData.passwordMessage.length > 0 ||
                               formData.password2.length == 0 ||
                               formData.password2Message.length > 0 ||
                               formData.emailMessage.length > 0;

    const handleSubmit = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        axios.post("/register", {
            username: formData.username,
            password: formData.password,
            email: formData.email,
            seed_requested: formData.seed_requested
        })
            .then(() => {
                navigate("/login", { state: { username: formData.username, password: formData.password, email: formData.email } });
            })
            .catch((error) => {
                if (error.response)
                    setRegistrationMessage(error.response.data.msg)
                else
                    setRegistrationMessage(error.message)
            })
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
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
                    Register
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Create your TrackEats account below
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
                <form onSubmit={handleSubmit} autoComplete="off">
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Username */}
                        <TextField
                            label="Username"
                            id="username"
                            value={formData.username}
                            inputProps={{ maxLength: 100 }}
                            onFocus={() => setFormData(prev => ({ ...prev, usernameTouched: false }))}
                            onBlur={() => setFormData(prev => ({ ...prev, usernameTouched: true }))}
                            onChange={usernameChanged}
                            error={!!(formData.usernameMessage && formData.usernameTouched && formData.username.length > 0)}
                            helperText={formData.usernameTouched && formData.username.length > 0 ? formData.usernameMessage : " "}
                            fullWidth
                        />
                        {/* Password */}
                        <TextField
                            label="Password"
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            inputProps={{ maxLength: 100 }}
                            onFocus={() => setFormData(prev => ({ ...prev, passwordTouched: false }))}
                            onBlur={() => setFormData(prev => ({ ...prev, passwordTouched: true }))}
                            onChange={passwordChanged}
                            error={!!(formData.passwordMessage && formData.passwordTouched && formData.password.length > 0)}
                            helperText={formData.passwordTouched && formData.password.length > 0 ? formData.passwordMessage : " "}
                            fullWidth
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
                        {/* Retype Password */}
                        <TextField
                            label="Retype Password"
                            id="password2"
                            type={showPassword2 ? 'text' : 'password'}
                            value={formData.password2}
                            inputProps={{ maxLength: 100 }}
                            onFocus={() => setFormData(prev => ({ ...prev, password2Touched: false }))}
                            onBlur={() => setFormData(prev => ({ ...prev, password2Touched: true }))}
                            onChange={password2Changed}
                            error={!!(formData.password2Message && formData.password2Touched && formData.password2.length > 0)}
                            helperText={formData.password2Touched && formData.password2.length > 0 ? formData.password2Message : " "}
                            fullWidth
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword2((show) => !show)}
                                            edge="end"
                                        >
                                            {showPassword2 ? <Visibility /> : <VisibilityOff />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        {/* Email Address */}
                        <TextField
                            label="Email Address"
                            id="email"
                            type="email"
                            value={formData.email}
                            inputProps={{ maxLength: 320 }}
                            onFocus={() => setFormData(prev => ({ ...prev, emailTouched: false }))}
                            onBlur={() => setFormData(prev => ({ ...prev, emailTouched: true }))}
                            onChange={emailChanged}
                            error={!!(formData.emailMessage && formData.emailTouched && formData.email.length > 0)}
                            helperText={formData.emailTouched && formData.email.length > 0 ? formData.emailMessage : " "}
                            fullWidth
                        />
                        {/* Seed Data Checkbox */}
                        <FormControlLabel
                            control={
                                <Checkbox
                                    id="seed_requested"
                                    checked={formData.seed_requested}
                                    onChange={e => setFormData(prev => ({ ...prev, seed_requested: e.target.checked }))}
                                    color="primary"
                                />
                            }
                            label={
                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    Add seed data to my new account
                                    <Tooltip title="This will populate your account with sample foods and recipes" placement="right">
                                        <HelpOutlineIcon style={{ marginLeft: 6, fontSize: 20, cursor: 'pointer' }} />
                                    </Tooltip>
                                </span>
                            }
                        />
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        When you click Register, an email will be sent to the Email Address.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Click on the link in that email (or paste it into a browser) to complete registration and activate your account.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={registerIsDisabled}
                            fullWidth
                        >
                            Register
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            fullWidth
                            onClick={() => navigate('/login')}
                        >
                            Cancel
                        </Button>
                    </Box>
                    {registrationMessage && (
                        <Typography color="error" sx={{ mt: 2 }}>
                            {registrationMessage}
                        </Typography>
                    )}
                </form>
            </Paper>
        </Box>
    );
}

export default RegisterPage;
