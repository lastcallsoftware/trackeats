import axios from "axios";
import PollingComponent from "./PollingComponent";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

function ConfirmUser() {
    const {state} = useLocation()
    const {username, password} = state;
    const navigate = useNavigate();
    const [message, setMessage] = useState("");

    const handleLogin = () => {
        setMessage("logging in with username + : " + username + ", password: " + password)
        axios.post("/login", {username: username, password: password })
        .then((response) => {
            sessionStorage.setItem("access_token", response.data.access_token);
            navigate("/")
        })
        .catch((error) => {
            if (error.response)
                setMessage(error.response.data.msg)
            else
                setMessage(error.message)
        })
    }

    return (
        <>
            <PollingComponent username={username} password={password} handleLogin={handleLogin} />
            <p>{message}</p>
        </>
    );
}

export default ConfirmUser;
