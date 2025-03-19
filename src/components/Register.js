import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Card, Form, Button } from "react-bootstrap";
import Swal from "sweetalert2";

const Register = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [gender, setGender] = useState("");
    const [birthdate, setBirthdate] = useState("");
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            Swal.fire({
                title: "Error!",
                text: "Passwords do not match",
                icon: "error",
                confirmButtonText: "OK"
            });
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password,confirmPassword, gender, birthdate }),
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
        <Container className="mt-5" style={{ width: "100%", maxWidth: "600px" }}>
            <Card className="p-4" >
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
                    <Form.Group>
                        <Form.Label>Confirm Password</Form.Label>
                        <Form.Control type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Gender</Form.Label>
                        <Form.Select value={gender} onChange={(e) => setGender(e.target.value)} required>
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </Form.Select>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Birthdate</Form.Label>
                        <Form.Control type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required />
                    </Form.Group>
                    <Button type="submit" className="mt-3">Register</Button>
                </Form>
                <Link to="/login" className="mt-3 d-block text-center">Already have an account? Login here</Link>
            </Card>
        </Container>
    );
};

export default Register;
