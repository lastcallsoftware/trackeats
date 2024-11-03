import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

function ConfirmUser() {
    const {state} = useLocation()
    const {username, password, email} = state;
    const navigate = useNavigate();
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
	const [loading, setLoading] = useState(true);    
    const [hasToken, setHasToken] = useState(false);

	useEffect(() => {
		const fetchApi = async () => {
			try {
				const datetime = new Intl.DateTimeFormat(navigator.language, {dateStyle: "full", timeStyle: "long"}).format(new Date());
				setMessage("Last checked at: " + datetime)
				axios.post("/login", {username: username, password: password})
				.then((response) => {
                    setHasToken(true)
					sessionStorage.setItem("access_token", response.data.access_token)
                    navigate("/")
				})
				.catch((error) => {
					if (error.response)
						setErrorMessage(error.response.data.msg)
					else
                        setErrorMessage(error.message)
				})
			} catch (error) {
				setErrorMessage("Error: " + error);
			} finally {
				setLoading(false);
			}
		};

		const intervalId = setInterval(() => {
			if (!hasToken) {
				fetchApi();
			}
		}, 5000);

		// Fetch immediately on mount
		fetchApi();

		// Cleanup interval on unmount
		return () => clearInterval(intervalId);
	}, [hasToken, navigate, username, password]);

    return (
        <>
            <p>Hello, {username}, check your inbox for an email from Trackeats!</p>
            <p>Click on the link in that email to complete registration and activate your account.</p>
			{loading ? (
				<p>Loading...</p>
			) : hasToken ? (
				<p>Login successful, redirecting...</p>
			) : (
                <>
                    <p>{message}</p>
                    <p className="errorText">{errorMessage}</p>
                </>
			)}
            <p>Don't see the email?  Click here to re-send the confirmation email to {email}</p>
            <p>Wrong email address?  Click here to cancel and start over.</p>
        </>
    );
}

export default ConfirmUser;
