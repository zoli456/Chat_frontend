import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import io from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import Login from "./components/Login";
import Register from "./components/Register";
import Chat from "./components/Chat";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./App.css";

const socket = io("http://localhost:5000");

const App = () => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [user, setUser] = useState(null);
    const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "true");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const verifyUser = async () => {
            if (!token) {
                setIsLoading(false);
                return;
            }
            try {
                const decodedToken = jwtDecode(token);
                if (decodedToken.exp * 1000 < Date.now()) {
                    handleLogout();
                    return;
                }
                const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/user`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });
                if (!response.ok) throw new Error("Failed to fetch user data");
                const data = await response.json();
                setUser(data);
            } catch (error) {
                handleLogout();
            } finally {
                setIsLoading(false);
            }
        };

        verifyUser();
    }, [token]);

    useEffect(() => {
        document.body.className = darkMode ? "dark-mode" : "";
        localStorage.setItem("darkMode", darkMode);
    }, [darkMode]);

    const handleLogout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
        setIsLoading(false);
        Swal.fire({
            title: "Logged Out",
            text: "You have been logged out successfully.",
            icon: "info",
            confirmButtonText: "OK"
        });
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Checking user...</p>
            </div>
        );
    }

    return (
        <div className={`app-container ${darkMode ? "dark" : "light"}`}>
            <button
                onClick={() => setDarkMode(!darkMode)}
                style={{ position: "absolute", top: 10, right: 10 }}
            >
                {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login setToken={setToken} socket={socket} />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/chat" element={token && user ? <Chat token={token} user={user} setToken={setToken} socket={socket} /> : <Navigate to="/login" />} />
                    <Route path="/" element={<Navigate to={token ? "/chat" : "/login"} />} />
                </Routes>
            </Router>
        </div>
    );
};

export default App;