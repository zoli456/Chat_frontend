import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Card, Form, Button } from "react-bootstrap";
import Swal from "sweetalert2";

const Register = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                Swal.fire({
                    title: "Success!",
                    text: "Registration successful. You can now log in.",
                    icon: "success",
                    confirmButtonText: "OK"
                }).then(() => navigate("/login"));
            } else {
                Swal.fire({
                    title: "Error!",
                    text: data.error || "Registration failed",
                    icon: "error",
                    confirmButtonText: "OK"
                });
            }
        } catch (error) {
            console.error("Registration error:", error);
            Swal.fire({
                title: "Error!",
                text: "An error occurred. Please try again.",
                icon: "error",
                confirmButtonText: "OK"
            });
        }
    };

    return (
        <Container className="mt-5">
            <Card className="p-4">
                <h2>Register</h2>
                <Form onSubmit={handleRegister}>
                    <Form.Group>
                        <Form.Label>Username</Form.Label>
                        <Form.Control type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Email</Form.Label>
                        <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Password</Form.Label>
                        <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </Form.Group>
                    <Button type="submit" className="mt-3">Register</Button>
                </Form>
                <Link to="/login" className="mt-3 d-block text-center">Already have an account? Login here</Link>
            </Card>
        </Container>
    );
};

export default Register;