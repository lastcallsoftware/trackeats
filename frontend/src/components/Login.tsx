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

    const usernameIsValid = formData.username.length >= 3;
    const passwordIsValid = formData.password.length >= 8;
    const loginIsDisabled = !usernameIsValid || !passwordIsValid;

    const server_base_url = import.meta.env.DEV ? "http://www.localhost:5000": "http://www.trackeats.com:5000"
    //const server_base_url = "http://localhost:5000"
    //const server_base_url = "http://www.trackeats.com:5000"

    const handleSubmit = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        axios.defaults.timeout = 4000
        axios.defaults.baseURL = server_base_url
        axios.post("/login", {username: formData.username, password: formData.password })
            .then((response) => {
                props.setToken(response.data.access_token);
                navigate("/")
            })
            .catch((error) => {setLoginMessage(error.response.data.message)})
    }

    //if (!props.login) {
    //    props.setToken(null)
    //}

    return (
        <section className="loginPage">
            <form className="loginForm" onSubmit={handleSubmit}>
                <section className="loginInputGroup">
                    <input id="username" className="username" type="text" placeholder="Username"
                        onBlur={() => setFormData(prevState => ({...prevState, usernameTouched: true})) }
                        onChange={(e) => setFormData(prevState => ({...prevState, username: e.target.value}))} />
                            { (formData.usernameTouched && !usernameIsValid && formData.username.length > 0) ? <p className="inputErrorText">The user name must be at least 3 characters.</p> : ""}
                    <br/>
                    <input id="password" className="password" type="password" placeholder="Password"
                        onBlur={() => setFormData(prevState => ({...prevState, passwordTouched: true})) }
                        onChange={(e) => setFormData(prevState => ({...prevState, password: e.target.value}))} />
                    { (formData.passwordTouched && !passwordIsValid && formData.password.length > 0) ? <p className="inputErrorText">The password must be at least 8 characters.</p> : ""}

                    <p className="loginError">{loginMessage}</p>
                    
                    <button className="button loginButton" type="submit" disabled={loginIsDisabled}>Login</button>
                </section>
            </form>
        </section>
    );
}

export default Login;
