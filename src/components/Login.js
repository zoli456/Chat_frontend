import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Card, Form, Button } from "react-bootstrap";
import Swal from "sweetalert2";
import HCaptcha from "@hcaptcha/react-hcaptcha";

const Login = ({ setToken }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [captchaToken, setCaptchaToken] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!captchaToken) {
            Swal.fire({
                icon: "error",
                title: "Verification Required",
                text: "Please complete the captcha verification."
            });
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, captchaToken }),
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem("token", data.token);
                setToken(data.token);

                Swal.fire({
                    icon: "success",
                    title: "Login Successful",
                    text: "Redirecting to chat...",
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    navigate("/chat");
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Login Failed",
                    text: data.error || "Invalid credentials."
                });
            }
        } catch (error) {
            console.error("Login error:", error);
            Swal.fire({
                icon: "error",
                title: "An Error Occurred",
                text: "Please try again."
            });
        }
    };

    return (
        <Container className="mt-5 d-flex justify-content-center">
            <Card className="p-4" style={{ width: "100%", maxWidth: "400px" }}>
                <h2 className="text-center">Login</h2>
                <Form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <Form.Label>Username</Form.Label>
                        <Form.Control
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="mb-3">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3 d-flex justify-content-center"> {/* Centered container */}
                        <HCaptcha
                            sitekey={process.env.REACT_APP_HCAPTCHA_SITE_KEY}
                            onVerify={(token) => setCaptchaToken(token)}
                        />
                    </div>
                    <Button type="submit" className="w-100">Login</Button>
                </Form>
                <Link to="/register" className="mt-3 d-block text-center">Don't have an account? Register here</Link>
            </Card>
        </Container>
    );
};

export default Login;