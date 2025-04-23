import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import io from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "./components/Login";
import Register from "./components/Register";
import Chat from "./components/Chat";
import DMessages from "./components/DMessages";
import Profile from "./components/Profile";
import { Forum } from "./components/Forum/Forum";
import LandingPage from "./components/LandingPage";
import Users from "./components/Users";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import TopicDiscussion from "./components/Forum/TopicDiscussion";
import { Topics } from "./components/Forum/Topics";

const App = () => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [user, setUser] = useState(null);
    const [darkMode, setDarkMode] = useState(() => {
        const savedMode = localStorage.getItem("darkMode");
        return savedMode !== null
            ? savedMode === "true"
            : window.matchMedia("(prefers-color-scheme: dark)").matches;
    });
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
                const expirationTime = decodedToken.exp * 1000;
                const currentTime = Date.now();
                const timeLeft = expirationTime - currentTime;

                if (timeLeft <= 0) {
                    await handleLogout();
                    return;
                }

                // Get user ID from decoded token
                const userId = decodedToken.id;

                // Send the ID in the request URL
                const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/user/${userId}`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                });

                if (!response.ok) throw new Error("Failed to fetch user data");

                const data = await response.json();
                setUser(data);

                const logoutTimer = setTimeout(() => {
                    handleLogout();
                    Swal.fire("Session Expired", "Your session has expired. Please log in again.", "warning");
                }, timeLeft);

                return () => clearTimeout(logoutTimer);
            } catch (error) {
                await handleLogout();
            } finally {
                setIsLoading(false);
            }
        };

        verifyUser();
    }, [token]);

    useEffect(() => {
        if (!token) return;

        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        socketRef.current = io("http://localhost:5000", { auth: { token } });
        socketRef.current.on("connect", () => {
            socketRef.current.emit("user_connected", jwtDecode(token).username);
        });
        socketRef.current.on("newDirectMessage", ({ sender, subject }) => {
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
                socketRef.current.off("newDirectMessage");
                socketRef.current.off("user_kicked");
                socketRef.current.off("force_logout");
                socketRef.current.off("user_banned");
                socketRef.current.disconnect();
            }
        };
    }, [token]);

    useEffect(() => {
        // Bootstrap 5.3+ dark mode
        document.documentElement.setAttribute("data-bs-theme", darkMode ? "dark" : "light");
        document.body.className = darkMode ? "dark-mode" : "light-mode";
        localStorage.setItem("darkMode", darkMode);
    }, [darkMode]);

    const handleLogout = async () => {
        try {
            if (token) {
                await fetch(`${process.env.REACT_APP_BASE_URL}/api/auth/logout`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                });
            }
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            setToken(null);
            setUser(null);
            localStorage.removeItem("token");
            setIsLoading(false);

            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        }
    };

    if (isLoading) {
        return (
            <div className="d-flex flex-column justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Checking user...</p>
            </div>
        );
    }

    return (
        <div className={`app-container ${darkMode ? "dark-mode" : "light-mode"}`}>
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={darkMode ? "dark" : "light"}
            />
            <Router>
                <nav className={`navbar navbar-expand-lg ${darkMode ? "navbar-dark bg-dark" : "navbar-light bg-light"}`}>
                    <div className="container-fluid">
                        <Link className="navbar-brand" to="/">MyApp</Link>
                        <button
                            className="navbar-toggler"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#navbarContent"
                            aria-controls="navbarContent"
                            aria-expanded="false"
                            aria-label="Toggle navigation"
                        >
                            <span className="navbar-toggler-icon"></span>
                        </button>
                        <div className="collapse navbar-collapse" id="navbarContent">
                            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                                <li className="nav-item">
                                    <Link className="nav-link" to="/">Landing</Link>
                                </li>
                                {token && user && (
                                    <>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/chat">Chat</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/messages">Messages</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/profile">Profile</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/forum">Forum</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/users">Users</Link>
                                        </li>
                                    </>
                                )}
                            </ul>
                            <div className="d-flex align-items-center">
                                <button
                                    onClick={() => setDarkMode(!darkMode)}
                                    className={`btn btn-sm ${darkMode ? "btn-light" : "btn-dark"}`}
                                    aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                                >
                                    {darkMode ? (
                                        <><i className="bi bi-sun-fill me-1"></i> Light Mode</>
                                    ) : (
                                        <><i className="bi bi-moon-fill me-1"></i> Dark Mode</>
                                    )}
                                </button>
                                {token ? (
                                    <button
                                        onClick={handleLogout}
                                        className="btn btn-sm btn-danger ms-2"
                                    >
                                        <i className="bi bi-box-arrow-right me-1"></i> Logout
                                    </button>
                                ) : (
                                    <Link to="/login" className="btn btn-sm btn-primary ms-2">
                                        <i className="bi bi-box-arrow-in-right me-1"></i> Login
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </nav>
                <Routes>
                    <Route path="/login" element={<Login setToken={setToken} darkMode={darkMode} />} />
                    <Route path="/register" element={<Register darkMode={darkMode} />} />
                    <Route path="/chat" element={token && user ? <Chat token={token} user={user} setToken={setToken} socket={socketRef.current} darkMode={darkMode}/> : <Navigate to="/login" />} />
                    <Route path="/messages" element={token && user ? <DMessages token={token} socket={socketRef.current} darkMode={darkMode}/> : <Navigate to="/login" />} />
                    <Route path="/messages/:id" element={<DMessages token={token} socket={socketRef.current} darkMode={darkMode}/>} />
                    <Route path="/profile" element={token && user ? <Profile user={user} darkMode={darkMode} /> : <Navigate to="/login" />} />
                    <Route path="/profile/:id?" element={token && user ? <Profile user={user} darkMode={darkMode} /> : <Navigate to="/login" />} />
                    <Route path="/users" element={token && user ? <Users token={token} darkMode={darkMode} /> : <Navigate to="/login" />} />
                    <Route path="/forum" element={token && user ? <Forum token={token} user={user} darkMode={darkMode}/> : <Navigate to="/login" />} />
                    <Route path="/forum/:subforumId" element={token && user ? <Topics token={token} user={user} darkMode={darkMode}/> : <Navigate to="/login" />} />
                    <Route path="/forum/:subforumId/topic/:topicId" element={token && user ? <TopicDiscussion token={token} user={user} darkMode={darkMode} socket={socketRef.current}/> : <Navigate to="/login" />} />
                    <Route path="/" element={<LandingPage darkMode={darkMode} />} />
                </Routes>
            </Router>
        </div>
    );
};

export default App;