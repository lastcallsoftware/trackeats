import { useEffect, useState } from 'react';
import axios from "axios";

// This component was originally intended to be used during the registration 
// process to intermittently poll the back end to see whether the user
// has registered yet, but the way registration works now this is unnecessary.
// But for now I'm keeping this code around, just in case we want to revisit
// the old method, or maybe use this for some other purpose.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PollingComponent(props: any) {
	const [loading, setLoading] = useState(true);
	const [token, setToken] = useState(null)
	const [errorMessage, setErrorMessage] = useState("")
	const [message, setMessage] = useState("")
	const {username, password, handleLogin} = props

	useEffect(() => {
		const fetchApi = async () => {
			try {
				const datetime = new Intl.DateTimeFormat(navigator.language, {dateStyle: "full", timeStyle: "long"}).format(new Date());
				setMessage("Last checked at: " + datetime + " " + username + " " + password)
				axios.post("/login", {username: username, password: password})
				.then((response) => {
					setToken(response.data.access_token)
					handleLogin()
				})
				.catch((error) => {
					if (error.response)
						setErrorMessage(error.response.data.msg)
					else
						setErrorMessage(error.message)
				})
			} catch (error) {
				setErrorMessage("Error fetching API: " + error);
			} finally {
				setLoading(false);
			}
		};

		const intervalId = setInterval(() => {
			if (!token) {
				fetchApi();
			}
		}, 5000);

		// Fetch immediately on mount
		fetchApi();

		// Cleanup interval on unmount
		return () => clearInterval(intervalId);
	}, [token, handleLogin, username, password]);

	return (
		<div>
			{loading ? (
				<p>Loading...</p>
			) : token ? (
				<p>The API returned a token!</p>
			) : (
				<p>{message}</p>
			)}
	        <p className="errorText">{errorMessage}</p>
		</div>
	);
};

export default PollingComponent;
