import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { apiRequest } from "./Utils";

const Profile = ({ user: currentUser, darkMode }) => {
    const { id } = useParams();
    const [profileUser, setProfileUser] = useState(null);
    const [activeSessions, setActiveSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCurrentUser, setIsCurrentUser] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setIsLoading(true);

                // Determine if we're viewing our own profile
                const viewingOwnProfile = !id || id === currentUser?.id;
                setIsCurrentUser(viewingOwnProfile);

                // Fetch the profile user data
                const userId = viewingOwnProfile ? currentUser.id : id;
                const data = await apiRequest(`user/${userId}`, "GET", localStorage.getItem("token"));
                setProfileUser(data);

                // Only fetch sessions for current user
                if (viewingOwnProfile) {
                    await fetchActiveSessions();
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
                toast.error("Failed to load profile");
                navigate("/users");
            } finally {
                setIsLoading(false);
            }
        };

        if (currentUser || id) {
            fetchProfile();
        } else {
            navigate("/login");
        }
    }, [id, currentUser]);

    const fetchActiveSessions = async () => {
        try {
            const data = await apiRequest("auth/sessions", "GET", localStorage.getItem("token"));
            setActiveSessions(data.sessions || []);
        } catch (error) {
            console.error("Error fetching sessions:", error);
            toast.error("Failed to load active sessions");
        }
    };

    const handleRevokeSession = async (sessionId) => {
        try {
            const result = await Swal.fire({
                title: "Are you sure?",
                text: "This will log you out from that device/session",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Yes, revoke it!"
            });

            if (result.isConfirmed) {
                await apiRequest(
                    `auth/sessions/revoke/${sessionId}`,
                    "POST",
                    localStorage.getItem("token")
                );
                toast.success("Session revoked successfully");
                fetchActiveSessions(); // Refresh the list
            }
        } catch (error) {
            console.error("Error revoking session:", error);
            toast.error("Failed to revoke session");
        }
    };

    const handleChangePassword = async () => {
        const { value: formValues } = await Swal.fire({
            title: "Change Password",
            html:
                '<input id="old-password" type="password" class="swal2-input" placeholder="Old Password">' +
                '<input id="new-password" type="password" class="swal2-input" placeholder="New Password">' +
                '<input id="confirm-password" type="password" class="swal2-input" placeholder="Confirm New Password">',
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                const oldPassword = document.getElementById("old-password").value;
                const newPassword = document.getElementById("new-password").value;
                const confirmPassword = document.getElementById("confirm-password").value;

                if (!oldPassword || !newPassword || !confirmPassword) {
                    Swal.showValidationMessage("All fields are required");
                    return false;
                }

                if (newPassword !== confirmPassword) {
                    Swal.showValidationMessage("New passwords do not match");
                    return false;
                }

                return { oldPassword, newPassword, confirmPassword };
            }
        });

        if (formValues) {
            try {
                const data = await apiRequest(
                    "user/change-password",
                    "POST",
                    localStorage.getItem("token"),
                    formValues
                );
                Swal.fire("Success", "Password changed successfully!", "success");
            } catch (error) {
                Swal.fire("Error", error.message || "Something went wrong", "error");
            }
        }
    };

    const formatDeviceInfo = (deviceInfo) => {
        if (!deviceInfo) return "Unknown device";

        if (deviceInfo.includes("Windows")) return "Windows PC";
        if (deviceInfo.includes("Macintosh")) return "Mac";
        if (deviceInfo.includes("Linux")) return "Linux PC";
        if (deviceInfo.includes("iPhone")) return "iPhone";
        if (deviceInfo.includes("iPad")) return "iPad";
        if (deviceInfo.includes("Android")) return "Android Device";

        return deviceInfo.substring(0, 30) + (deviceInfo.length > 30 ? "..." : "");
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">User not found</div>
            </div>
        );
    }

    return (
        <div className={`container mt-5 ${darkMode ? "text-white" : ""}`}>
            <h1>Profile {!isCurrentUser && `- ${profileUser.username}`}</h1>
            <div className="row">
                <div className="col-md-6">
                    <div className={`card mb-4 ${darkMode ? "bg-dark" : ""}`}>
                        <div className={`card-header ${darkMode ? "bg-secondary" : ""}`}>
                            <h5>Account Information</h5>
                        </div>
                        <div className="card-body">
                            <p><strong>Name:</strong> {profileUser.username}</p>
                            <p><strong>Email:</strong> {profileUser.email}</p>
                            <p><strong>Roles:</strong> {profileUser.roles?.join(", ") || "User"}</p>
                            <p><strong>Gender:</strong> {profileUser.gender}</p>
                            <p><strong>Birthdate:</strong> {new Date(profileUser.birthdate).toLocaleDateString()}</p>
                            <p><strong>Account Created:</strong> {new Date(profileUser.createdAt).toLocaleString()}</p>
                            <p>
                                <strong>Ban Status:</strong> {profileUser.isBanned ?
                                <span className="text-danger">Banned until {new Date(profileUser.banExpiresAt).toLocaleString()}</span> :
                                <span className="text-success">Not Banned</span>}
                            </p>

                            <p>
                                <strong>Mute Status:</strong> {profileUser.isMuted ?
                                <span className="text-warning">Muted until {new Date(profileUser.muteExpiresAt).toLocaleString()}</span> :
                                <span className="text-success">Not Muted</span>}
                            </p>

                            {isCurrentUser && (
                                <button
                                    className={`btn ${darkMode ? "btn-light" : "btn-primary"}`}
                                    onClick={handleChangePassword}
                                >
                                    Change Password
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {isCurrentUser && (
                    <div className="col-md-6">
                        <div className={`card ${darkMode ? "bg-dark" : ""}`}>
                            <div className={`card-header ${darkMode ? "bg-secondary" : ""}`}>
                                <h5>Active Sessions</h5>
                            </div>
                            <div className="card-body">
                                {activeSessions.length === 0 ? (
                                    <p>No active sessions found</p>
                                ) : (
                                    <div className="list-group">
                                        {activeSessions.map((session) => (
                                            <div
                                                key={session.id}
                                                className={`list-group-item ${darkMode ? "bg-dark text-white" : ""}`}
                                            >
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <strong>{formatDeviceInfo(session.deviceInfo)}</strong>
                                                        <div className={`small ${darkMode ? "text-light" : "text-muted"}`}>
                                                            IP: {session.ipAddress || 'Unknown'}
                                                        </div>
                                                        <div className={`small ${darkMode ? "text-light" : "text-muted"}`}>
                                                            Logged in: {formatDate(session.createdAt)}
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => handleRevokeSession(session.id)}
                                                        disabled={session.id === currentUser.currentSessionId}
                                                    >
                                                        Revoke
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;