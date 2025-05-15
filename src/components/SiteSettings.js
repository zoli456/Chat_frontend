import React, { useState, useEffect } from "react";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import Swal from "sweetalert2";
import { apiRequest } from "./Utils.js";

const SiteSettings = ({ token, darkMode }) => {
    const [settings, setSettings] = useState({
        loginEnabled: true,
        registrationEnabled: true
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await apiRequest("settings", "GET", token);
                const settingsObj = {};
                data.forEach(setting => {
                    settingsObj[setting.name] = setting.value === 'true';
                });
                setSettings(settingsObj);
                setLoading(false);
            } catch (err) {
                setError("Failed to load settings");
                setLoading(false);
            }
        };

        fetchSettings();
    }, [token]);

    const handleChange = (e) => {
        const { name, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const settingsArray = Object.entries(settings).map(([name, value]) => ({
                name,
                value: value.toString()
            }));

            await apiRequest("settings", "PUT", token, settingsArray);
            Swal.fire({
                title: "Success!",
                text: "Settings updated successfully",
                icon: "success",
                confirmButtonText: "OK"
            });
        } catch (err) {
            setError("Failed to update settings");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </Container>
        );
    }

    return (
        <Container className="mt-5">
            <Card className={`${darkMode ? "bg-dark text-white" : ""}`}>
                <Card.Body>
                    <Card.Title>Site Settings</Card.Title>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="switch"
                                id="loginEnabled"
                                name="loginEnabled"
                                label="Enable User Login"
                                checked={settings.loginEnabled}
                                onChange={handleChange}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="switch"
                                id="registrationEnabled"
                                name="registrationEnabled"
                                label="Enable User Registration"
                                checked={settings.registrationEnabled}
                                onChange={handleChange}
                            />
                        </Form.Group>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Settings"}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default SiteSettings;