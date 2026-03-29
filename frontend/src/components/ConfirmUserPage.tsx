import axios from "axios";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import RegisterStateLoading from "./RegisterStateLoading";
import RegisterStateSuccess from "./RegisterStateSuccess";
import RegisterStateError from "./RegisterStateError";


export default function ConfirmUserPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");

    // Derive initial state before any effect runs
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        token ? "loading" : "error"
    );
    const [username, setUsername] = useState("");
    const [showResend, setShowResend] = useState(false);
    const [errorMessage, setErrorMessage] = useState(
        token ? "" : "No confirmation token found."
    );
    const [resendStatus, setResendStatus] = useState<"idle" | "sent" | "error">("idle")

    useEffect(() => {
        if (!token) return; // nothing to do — state already set correctly above

        const confirmToken = async () => {
            try {
                const { data } = await axios.get(`/confirm?token=${token}`)
                setUsername(data.username);
                setStatus("success");
                
                // Broadcast to the orphaned login tab
                const channel = new BroadcastChannel("trackeats_auth");
                channel.postMessage({ type: "EMAIL_CONFIRMED", username });
                channel.close();
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    switch (error.response?.status) {
                        case 400:
                            setErrorMessage(error.response.data?.msg ?? "The confirmation token was missing from the link.");
                            break;
                        case 401:
                            setErrorMessage(error.response.data?.msg ?? "The confirmation link is invalid.");
                            break;
                        case 403:
                            setErrorMessage(error.response.data?.msg ?? "The confirmation link has expired.");
                            setShowResend(true);
                            break;
                        // We don't treat "already confirmed" as an error on the backend anymore
                        //case 409:
                        //    setUsername(error.response.data?.username);
                        //    setStatus("success")
                        //    break;
                        default:
                            setErrorMessage("Something went wrong on our end. Please try again later.");
                    }
                } else {
                    setErrorMessage("Could not reach the server.  Please try again.");
                }
                setStatus("error")
            }
        };

        confirmToken();
    }, [token, username]);


    const handleResend = async () => {
        try {
            await axios.post("/register", { token });
            setResendStatus("sent");
        } catch {
            setResendStatus("error")
        }
    }


    if (status === "loading")
        return <RegisterStateLoading />;
    else if (status === "success")
        return <RegisterStateSuccess
            username={username}
            onLogin={() => navigate("/login")} />;
    else
        return <RegisterStateError
            message={errorMessage}
            showResend={showResend}
            resendStatus={resendStatus}
            onResend={handleResend} />;
}