import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Card, Form, Button } from "react-bootstrap";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";

const Login = ({ setToken, socket }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem("token", data.token);
                setToken(data.token);
                socket.emit("user_connected", jwtDecode(data.token).username);

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
        <Container className="mt-5">
            <Card className="p-4">
                <h2>Login</h2>
                <Form onSubmit={handleSubmit}>
                    <Form.Group>
                        <Form.Label>Username</Form.Label>
                        <Form.Control type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Password</Form.Label>
                        <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </Form.Group>
                    <Button type="submit" className="mt-3">Login</Button>
                </Form>
                <Link to="/register" className="mt-3 d-block text-center">Don't have an account? Register here</Link>
            </Card>
        </Container>
    );
};

export default Login;
