import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import io from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import Login from "./components/Login";
import Register from "./components/Register";
import Chat from "./components/Chat";
import DMessages from "./components/DMessages";
import Profile from "./components/Profile";
import LandingPage from "./components/LandingPage";
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
            text: "Your got expired or invalid.",
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
            <Router>
                <nav className="navbar navbar-expand-lg navbar-light bg-light">
                    <div className="container">
                        <Link className="navbar-brand" to="/">MyApp</Link>
                        <div className="collapse navbar-collapse">
                            <ul className="navbar-nav me-auto">
                                <li className="nav-item"><Link className="nav-link" to="/">Landing</Link></li>
                                {token && user && <>
                                    <li className="nav-item"><Link className="nav-link" to="/chat">Chat</Link></li>
                                    <li className="nav-item"><Link className="nav-link" to="/messages">Messages</Link></li>
                                    <li className="nav-item"><Link className="nav-link" to="/profile">Profile</Link></li>
                                </>}
                            </ul>
                        </div>
                        <button onClick={() => setDarkMode(!darkMode)} className="btn btn-outline-dark">
                            {darkMode ? "Light Mode" : "Dark Mode"}
                        </button>
                        {token ? (
                            <button onClick={handleLogout} className="btn btn-danger ms-2">Logout</button>
                        ) : (
                            <Link to="/login" className="btn btn-primary ms-2">Login</Link>
                        )}
                    </div>
                </nav>
                <Routes>
                    <Route path="/login" element={<Login setToken={setToken} socket={socket} />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/chat" element={token && user ? <Chat token={token} user={user} setToken={setToken} socket={socket} /> : <Navigate to="/login" />} />
                    <Route path="/messages" element={token && user ? <DMessages token={token} /> : <Navigate to="/login" />} />
                    <Route path="/profile" element={token && user ? <Profile user={user} /> : <Navigate to="/login" />} />
                    <Route path="/" element={<LandingPage />} />
                </Routes>
            </Router>
        </div>
    );
};

export default App;
