import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Register(props: any) {
    const defaultFormData = {username: "", usernameTouched: false, usernameMessage: "",
                             password: "", passwordTouched: false, passwordMessage: "",
                             password2: "", password2Touched: false, password2Message: "",
                             email: "", emailTouched: false, emailMessage: ""}
    const [formData, setFormData] = useState(defaultFormData);
    const [registerMessage, setRegisterMessage] = useState("");
    const navigate = useNavigate();

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
            msg = "The email address must contain a @ character";
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
        // Prevent default behavior for form submission (namely, sending the form to the server)
        e.preventDefault();

        // Call the back end's /register API with the username and password from the form.
        // If successful, log the user in using the back end's /login API
        axios.post("/register", {username: formData.username, password: formData.password, email: formData.email})
            .then(() => {
                axios.post("/login", {username: formData.username, password: formData.password })
                .then((response) => {
                    props.storeTokenFunction(formData.username, response.data.access_token);
                    navigate("/")
                })
                .catch((error) => {
                    setRegisterMessage(error.response.data.msg)
                })
            })
            .catch((error) => {
                setRegisterMessage(error.response.data.msg)
            })
        }

    return (
        <section className="loginPage">
            <form className="loginForm" onSubmit={handleSubmit}>
                <section className="loginBoundingBox">
                    <section className="loginInputGroup">
                        <input id="username"type="text" placeholder="Username" maxLength={100}
                            onFocus={() => setFormData(prevState => ({...prevState, usernameTouched: false}))}
                            onBlur={() => setFormData(prevState => ({...prevState, usernameTouched: true}))}
                            onChange={usernameChanged} />
                        {(formData.usernameMessage && formData.usernameTouched && formData.username.length > 0) ? <p className="inputErrorText">{formData.usernameMessage}</p> : ""}

                        <input id="password" type="password" placeholder="Password" maxLength={100}
                            onFocus={() => setFormData(prevState => ({...prevState, passwordTouched: false}))}
                            onBlur={() => setFormData(prevState => ({...prevState, passwordTouched: true}))}
                            onChange={passwordChanged} />
                        {(formData.passwordMessage && formData.passwordTouched && formData.password.length > 0) ? <p className="inputErrorText">{formData.passwordMessage}</p> : ""}

                        <input id="password2" type="password" placeholder="Retype password" maxLength={100}
                            onFocus={() => setFormData(prevState => ({...prevState, password2Touched: false}))}
                            onBlur={() => setFormData(prevState => ({...prevState, password2Touched: true}))}
                            onChange={password2Changed} />
                        {(formData.password2Message && formData.password2Touched && formData.password2.length > 0) ? <p className="inputErrorText">{formData.password2Message}</p> : ""}

                        <input id="email" type="text" placeholder="Email address" maxLength={320}
                            onFocus={() => setFormData(prevState => ({...prevState, emailTouched: false}))}
                            onBlur={() => setFormData(prevState => ({...prevState, emailTouched: true}))}
                            onChange={emailChanged}/>
                        {(formData.emailMessage && formData.emailTouched && formData.email.length > 0) ? <p className="inputErrorText">{formData.emailMessage}</p> : ""}

                        <p className="loginError">{registerMessage}</p>
                        
                        <button className="button loginButton" type="submit" disabled={registerIsDisabled}>Register</button>
                    </section>
                </section>
            </form>
        </section>
    );
}

export default Register;
