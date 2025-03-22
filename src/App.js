import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import io from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { toast, ToastContainer } from "react-toastify";
import Login from "./components/Login";
import Register from "./components/Register";
import Chat from "./components/Chat";
import DMessages from "./components/DMessages";
import Profile from "./components/Profile";
import {Forum} from "./components/Forum/Forum";
import LandingPage from "./components/LandingPage";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import TopicDiscussion from "./components/Forum/TopicDiscussion";
import {Topics} from "./components/Forum/Topics";

const App = () => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [user, setUser] = useState(null);
    const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "true");
    const [isLoading, setIsLoading] = useState(true);
    const socketRef = useRef(null);

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
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
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
        if (!token) return;

        // Prevent multiple connections
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        socketRef.current = io("http://localhost:5000", { auth: { token } });

        socketRef.current.on("connect", () => {
            socketRef.current.emit("user_connected", jwtDecode(token).username);
        });

        socketRef.current.on("newDM", ({ sender, subject }) => {
            toast.info(`New DM from ${sender}: "${subject}"`, {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        });

        socketRef.current.on("user_kicked", () => {
            handleLogout();
            Swal.fire("You have been kicked", "You have been removed from the chat.", "error");
        });

        socketRef.current.on("force_logout", () => {
            handleLogout();
            Swal.fire("Logged out", "You logged in from another device.", "warning");
        });

        socketRef.current.on("user_banned", ({ reason, expiresAt }) => {
            handleLogout();
            Swal.fire("You have been banned", `Reason: ${reason}. Ends: ${expiresAt ? new Date(expiresAt).toLocaleString() : "Permanent"}`, "error");
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.off("newDM");
                socketRef.current.off("user_kicked");
                socketRef.current.off("force_logout");
                socketRef.current.off("user_banned");
                socketRef.current.disconnect();
            }
        };
    }, [token]);

    useEffect(() => {
        document.body.classList.toggle("dark-mode", darkMode);
        localStorage.setItem("darkMode", darkMode);
    }, [darkMode]);


    const handleLogout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
        setIsLoading(false);
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
            <ToastContainer />
            <Router>
                <nav className="navbar navbar-expand-lg navbar-light bg-light">
                    <div className="container">
                        <Link className="navbar-brand" to="/">MyApp</Link>
                        <div className="collapse navbar-collapse">
                            <ul className="navbar-nav me-auto">
                                <li className="nav-item"><Link className="nav-link" to="/">Landing</Link></li>
                                {token && user && (
                                    <>
                                        <li className="nav-item"><Link className="nav-link" to="/chat">Chat</Link></li>
                                        <li className="nav-item"><Link className="nav-link" to="/messages">Messages</Link></li>
                                        <li className="nav-item"><Link className="nav-link" to="/profile">Profile</Link></li>
                                        <li className="nav-item"><Link className="nav-link" to="/forum">Forum</Link></li>
                                    </>
                                )}
                            </ul>
                        </div>
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className={`btn ${darkMode ? "btn-light" : "btn-dark"}`}
                        >
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
                    <Route path="/login" element={<Login setToken={setToken} />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/chat" element={token && user ? <Chat token={token} user={user} setToken={setToken} socket={socketRef.current} /> : <Navigate to="/login" />} />
                    <Route path="/messages" element={token && user ? <DMessages token={token} /> : <Navigate to="/login" />} />
                    <Route path="/profile" element={token && user ? <Profile user={user} /> : <Navigate to="/login" />} />
                    <Route path="/forum" element={token && user ? <Forum token={token} user={user} darkMode={darkMode}/> : <Navigate to="/login" />} />
                    <Route path="/forum/:subforumId" element={token && user ? <Topics token={token} user={user} darkMode={darkMode}/> : <Navigate to="/login" />} />
                    { <Route path="/forum/:subforumId/topic/:topicId" element={token && user ? <TopicDiscussion token={token} user={user} darkMode={darkMode} /> : <Navigate to="/login" />} /> }
                    <Route path="/" element={<LandingPage />} />
                </Routes>
            </Router>
        </div>
    );
};

export default App;