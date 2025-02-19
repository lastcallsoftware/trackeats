import { useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import axios from "axios";

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
                if (error.response)
                    setLoginMessage(error.response.data.msg)
                else
                    setLoginMessage(error.message)
            })
    }

    return (
        <section className="loginPage">
            <form className="inputForm" onSubmit={handleSubmit}>
                <section className="inputBoundingBox loginBoundingBox">
                    <section className="inputLine">
                        <label htmlFor="username">Username:</label>
                        <input id="username" type="text" placeholder="Username" value={formData.username}
                            onChange={(e) => setFormData(prevState => ({...prevState, username: e.target.value}))} />
                    </section>
                    
                    <section className="inputLine">
                        <label htmlFor="password">Password:</label>
                        <input id="password" type="password" placeholder="Password" value={formData.password}
                            onChange={(e) => setFormData(prevState => ({...prevState, password: e.target.value}))} />
                    </section>

                    {isConfirm ? <><p>Check your inbox for an email from Trackeats.</p><p>Click on the link in that email
                        (or paste it into a browser) to complete registration and activate your account.</p><p>Then you will be able to log in.</p></> : ""}

                    <button className="button loginButton" type="submit" disabled={loginIsDisabled}>Login</button>

                    <p className="errorText">{loginMessage}</p>
                </section>
            </form>
        </section>
    );
}

export default LoginPage;
