import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import RegisterStateLoading from "./RegisterStateLoading";
import RegisterStateSuccess from "./RegisterStateSuccess";
import RegisterStateError from "./RegisterStateError";

export default function ConfirmEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");

    // Derive initial state before any effect runs
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        token ? "loading" : "error"
    );
    const [username, setUsername] = useState("");
    const [errorMessage, setErrorMessage] = useState(
        token ? "" : "No confirmation token found."
    );

    useEffect(() => {
        if (!token) return; // nothing to do — state already set correctly above

        fetch("/api/confirm-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.success) {
                    setUsername(data.username);
                    setStatus("success");
                } else {
                    setErrorMessage(data.error || "Something went wrong.");
                    setStatus("error");
                }
            })
            .catch(() => {
                setErrorMessage("Could not reach the server. Please try again.");
                setStatus("error");
            });
    }, [token]);

    if (status === "loading") return <RegisterStateLoading />;
    if (status === "success") return <RegisterStateSuccess username={username} onLogin={() => navigate("/login")} />;
    return <RegisterStateError message={errorMessage} onResend={() => navigate("/resend-confirmation")} />;
}