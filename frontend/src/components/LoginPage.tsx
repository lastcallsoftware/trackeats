import { useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import axios from "axios";
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LoginPage(props: any) {
    // If we were sent here from the Confirm page, the state will contain username and password
    const location = useLocation();
    const isConfirm = location.state && location.state.username
    const defaultFormData = {username: location.state?.username || "", usernameTouched: false,
                             password: location.state?.password || "", passwordTouched: false}
    const [formData, setFormData] = useState(defaultFormData);
    const [loginMessage, setLoginMessage] = useState("");
    const navigate = useNavigate();

    const usernameIsValid = formData.username.length > 0;
    const passwordIsValid = formData.password.length > 0;
    const loginIsDisabled = !usernameIsValid || !passwordIsValid;

    const handleSubmit = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        // Call the back end's /login API with the username and password from the form
        axios.post("/login", {username: formData.username, password: formData.password })
            .then((response) => {
                props.storeTokenFunction(response.data.access_token);
                navigate("/foods")
            })
            .catch((error) => {
                console.log(error)
                if (error.response)
                    setLoginMessage(error.response.data.msg)
                else
                    setLoginMessage(error.message)
            })
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 8, p: 4, border: '1px solid #ccc', borderRadius: 2 }}>
            <Typography variant="h5" align="center" gutterBottom>Login</Typography>
            <form onSubmit={handleSubmit}>
                <Box display="flex" flexDirection="column" gap={3}>
                    <TextField
                        label="Username"
                        variant="outlined"
                        value={formData.username}
                        onChange={(e) => setFormData(prevState => ({...prevState, username: e.target.value}))}
                        required
                        autoFocus
                    />
                    <TextField
                        label="Password"
                        variant="outlined"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prevState => ({...prevState, password: e.target.value}))}
                        required
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
                    {loginMessage && (
                        <Typography className="errorText" color="error">{loginMessage}</Typography>
                    )}
                </Box>
            </form>
        </Container>
    );
}

export default LoginPage;
