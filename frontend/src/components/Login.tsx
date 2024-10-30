import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Login(props: any) {
    const defaultFormData = {username: "", usernameTouched: false,
                             password: "", passwordTouched: false}
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
                props.storeTokenFunction(formData.username, response.data.access_token);
                navigate("/")
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
                <section className="inputBoundingBox">
                    <section className="inputLine">
                        <label htmlFor="username">Username:</label>
                        <input id="username" type="text" placeholder="Username"
                            onChange={(e) => setFormData(prevState => ({...prevState, username: e.target.value}))} />
                    </section>
                    
                    <section className="inputLine">
                        <label htmlFor="password">Password:</label>
                        <input id="password" type="password" placeholder="Password" 
                            onChange={(e) => setFormData(prevState => ({...prevState, password: e.target.value}))} />
                    </section>

                    <button className="button loginButton" type="submit" disabled={loginIsDisabled}>Login</button>

                    <p className="errorText">{loginMessage}</p>
                </section>
            </form>
        </section>
    );
}

export default Login;
