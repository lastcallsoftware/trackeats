import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";

function RegisterPage() {
    const defaultFormData = {username: "", usernameTouched: false, usernameMessage: "",
                             password: "", passwordTouched: false, passwordMessage: "",
                             password2: "", password2Touched: false, password2Message: "",
                             email: "", emailTouched: false, emailMessage: ""}
    const [formData, setFormData] = useState(defaultFormData);
    const [errorMessage, setErrorMessage] = useState("");
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
        // Prevent default behavior for form submission (namely, sending the form to the server)
        e.preventDefault();

        // Call the back end's /register API with the username and password from the form.
        // If successful, send the user to the Confirmation page to await final confirmation.
        axios.post("/register", {username: formData.username, password: formData.password, email: formData.email})
            .then(() => {
                navigate("/login", { state: { username: formData.username, password: formData.password, email: formData.email } });
            })
            .catch((error) => {
                if (error.response)
                    setErrorMessage(error.response.data.msg)
                else
                    setErrorMessage(error.message)
            })
        }

    return (
        <section className="registerPage">
            <form className="inputForm" onSubmit={handleSubmit}>
                <section className="inputBoundingBox registerBoundingBox">

                    {/* Username */}
                    <section className="inputLine">
                        <label htmlFor="username">Username:</label>
                        <input id="username" type="text" placeholder="Username" maxLength={100}
                            onFocus={() => setFormData(prevState => ({...prevState, usernameTouched: false}))}
                            onBlur={() => setFormData(prevState => ({...prevState, usernameTouched: true}))}
                            onChange={usernameChanged} />
                    </section>
                    {(formData.usernameMessage && formData.usernameTouched && formData.username.length > 0) ? 
                    <section className="inputLine">
                        <p className = "inputSpacer" />
                        <p className="inputErrorText">{formData.usernameMessage}</p>
                    </section> : "" }

                    {/* Password */}
                    <section className="inputLine">
                        <label htmlFor="password">Password:</label>
                        <input id="password" type="password" placeholder="Password" maxLength={100}
                            onFocus={() => setFormData(prevState => ({...prevState, passwordTouched: false}))}
                            onBlur={() => setFormData(prevState => ({...prevState, passwordTouched: true}))}
                            onChange={passwordChanged} />
                    </section>
                    {(formData.passwordMessage && formData.passwordTouched && formData.password.length > 0) ?
                    <section className="inputLine">
                        <p className = "inputSpacer" />
                        <p className="inputErrorText">{formData.passwordMessage}</p>
                    </section> : ""}

                    {/* Password 2 */}
                    <section className="inputLine">
                        <label htmlFor="password2">Retype Password:</label>
                        <input id="password2" type="password" placeholder="Retype password" maxLength={100}
                            onFocus={() => setFormData(prevState => ({...prevState, password2Touched: false}))}
                            onBlur={() => setFormData(prevState => ({...prevState, password2Touched: true}))}
                            onChange={password2Changed} />
                    </section>
                    {(formData.password2Message && formData.password2Touched && formData.password2.length > 0) ?
                    <section className="inputLine">
                        <p className = "inputSpacer" />
                        <p className="inputErrorText">{formData.password2Message}</p>
                    </section> : ""}

                    {/* Email Address */}
                    <section className="inputLine">
                        <label htmlFor="email">Email Address:</label>
                        <input id="email" type="email" placeholder="Email address" maxLength={320}
                            onFocus={() => setFormData(prevState => ({...prevState, emailTouched: false}))}
                            onBlur={() => setFormData(prevState => ({...prevState, emailTouched: true}))}
                            onChange={emailChanged}/>
                    </section>
                    {(formData.emailMessage && formData.emailTouched && formData.email.length > 0) ?
                    <section className="inputLine">
                        <p className = "inputSpacer" />
                        <p className="inputErrorText">{formData.emailMessage}</p>
                    </section> : ""}

                    <br/>
                    <p>When you click Register, an email will be sent to the Email Address.</p>
                    <p>Click on the link in that email (or paste it into a brower) to complete registration and activate your accoount.</p>
                    <br/>
                    <button className="button loginButton" type="submit" disabled={registerIsDisabled}>Register</button>

                    <p className="errorText">{errorMessage}</p>
                </section>
            </form>
        </section>
    );
}

export default RegisterPage;
