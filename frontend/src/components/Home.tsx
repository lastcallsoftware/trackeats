import { useLocation } from "react-router-dom";

function Home() {
    const location = useLocation();
    const message = location.state?.message ||  ""

    return (
        <>
            <p>{message}</p>
        </>
    );
}

export default Home;
