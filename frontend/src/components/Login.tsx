import { useState } from "react";
//import { useNavigate } from 'react-router-dom';
import axios from "axios";

function Login() {
    const defaultFormData = {username: "", usernameTouched: false,
                             password: "", passwordTouched: false}
    const [formData, setFormData] = useState(defaultFormData);
    //const navigate = useNavigate();

    const usernameIsValid = formData.username.length >= 3;
    const passwordIsValid = formData.password.length >= 8;
    const loginIsDisabled = !usernameIsValid || !passwordIsValid;

    const handleSubmit = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        console.log("Username: " + formData.username + ", Password: " + formData.password)
        axios.post("http://localhost:8080/login", {username: formData.username, password: formData.password })
            .then((response) => {console.log("Response: " + response)})
            .catch((error) => {console.log("Error: " + error)})

        // Redirect the user to a different page after successful login
        //navigate("/", {state: formData});
    }

    return (
        <section className="loginPage">
            <form className="loginForm" onSubmit={handleSubmit}>
                <section className="loginInputGroup">
                    <label htmlFor="username">User Name: </label>
                    <input id="username" className="username" type="text" placeholder="Username"
                        onBlur={() => setFormData(prevState => ({...prevState, usernameTouched: true})) }
                        onChange={(e) => setFormData(prevState => ({...prevState, username: e.target.value}))} /><br/>
                            { (formData.usernameTouched && !usernameIsValid && formData.username.length > 0) ? <p className="inputErrorText">The user name must be at least 3 characters.</p> : ""}

                    <label htmlFor="password">Password: </label>
                    <input id="password" className="password" type="password" placeholder="Password"
                        onBlur={() => setFormData(prevState => ({...prevState, passwordTouched: true})) }
                        onChange={(e) => setFormData(prevState => ({...prevState, password: e.target.value}))} />
                    { (formData.passwordTouched && !passwordIsValid && formData.password.length > 0) ? <p className="inputErrorText">The password must be at least 8 characters.</p> : ""}

                    <br/><button className="button loginButton" type="submit" disabled={loginIsDisabled}>Login</button>
                    </section>
            </form>
        </section>
    );
}

export default Login;
