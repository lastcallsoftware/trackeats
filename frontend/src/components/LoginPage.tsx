import { useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import axios from "axios";
import { Button, Container, Field, Input, Text } from "@chakra-ui/react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LoginPage(props: any) {
    // If we were sent here from the Confirm page, the state will contain username and password
    const location = useLocation();
    const isConfirm = location.state && location.state.username
    const defaultFormData = {username: location.state?.username || "", usernameTouched: false,
                             password: location.state?.password || "", passwordTouched: false}
    const [formData, setFormData] = useState(defaultFormData);
    const [loginMessage, setLoginMessage] = useState("");
    const navigate = useNavigate();

    const usernameIsValid = formData.username.length > 0;
    const passwordIsValid = formData.password.length > 0;
    const loginIsDisabled = !usernameIsValid || !passwordIsValid;

    const handleSubmit = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        // Call the back end's /login API with the username and password from the form
        axios.post("/login", {username: formData.username, password: formData.password })
            .then((response) => {
                props.storeTokenFunction(response.data.access_token);
                navigate("/foods")
            })
            .catch((error) => {
                if (error.response)
                    setLoginMessage(error.response.data.msg)
                else
                    setLoginMessage(error.message)
            })
    }

    return (
        <form onSubmit={handleSubmit}>
            <Container marginLeft={"30%"} width={"40%"} border={"1px solid"} padding={5}>
                <Field.Root orientation={"horizontal"} marginTop={2}>
                    <Field.Label minWidth={100}>Username:</Field.Label>
                    <Input type="text" placeholder="Username" value={formData.username} height={6}
                        onChange={(e) => setFormData(prevState => ({...prevState, username: e.target.value}))} />
                </Field.Root>

                <Field.Root orientation={"horizontal"} marginTop={2}>
                    <Field.Label textAlign={"right"} minWidth={100}>Password:</Field.Label>
                    <Input type="password" placeholder="Password" value={formData.password} height={6}
                        onChange={(e) => setFormData(prevState => ({...prevState, password: e.target.value}))} />
                </Field.Root>

                {isConfirm ? <><p>Check your inbox for an email from Trackeats.</p><p>Click on the link in that email
                    (or paste it into a browser) to complete registration and activate your account.</p><p>Then you will be able to log in.</p></> : ""}

                <Button h={8} color={"black"} type="submit" disabled={loginIsDisabled}>Login</Button><br/>

                <Text className="errorText">{loginMessage}</Text>
            </Container>
        </form>
    );
}

export default LoginPage;
