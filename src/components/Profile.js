import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Profile = ({ user }) => {
    const [activeSessions, setActiveSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate("/login");
        } else {
            fetchActiveSessions();
        }
    }, [user]);

    const fetchActiveSessions = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/auth/sessions`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (!response.ok) {
                throw new Error("Failed to fetch sessions");
            }

            const data = await response.json();
            setActiveSessions(data.sessions || []);
        } catch (error) {
            console.error("Error fetching sessions:", error);
            toast.error("Failed to load active sessions");
        } finally {
            setIsLoading(false);
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
                const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/auth/sessions/revoke/${sessionId}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                });

                if (response.ok) {
                    toast.success("Session revoked successfully");
                    fetchActiveSessions(); // Refresh the list
                } else {
                    throw new Error("Failed to revoke session");
                }
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
                const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/user/change-password`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify(formValues)
                });

                const data = await response.json();

                if (response.ok) {
                    Swal.fire("Success", "Password changed successfully!", "success");
                } else {
                    Swal.fire("Error", data.message || "Password change failed", "error");
                }
            } catch (error) {
                Swal.fire("Error", "Something went wrong", "error");
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

    return (
        <div className="container mt-5">
            <h1>Profile</h1>
            <div className="row">
                <div className="col-md-6">
                    <div className="card mb-4">
                        <div className="card-header">
                            <h5>Account Information</h5>
                        </div>
                        <div className="card-body">
                            <p><strong>Name:</strong> {user?.username}</p>
                            <p><strong>Email:</strong> {user?.email}</p>
                            <p><strong>Roles:</strong> {user?.roles?.join(", ") || "User"}</p>
                            <p><strong>Gender:</strong> {user?.gender}</p>
                            <p><strong>Birthdate:</strong> {new Date(user?.birthdate).toLocaleDateString()}</p>
                            <p><strong>Account Created:</strong> {new Date(user?.createdAt).toLocaleString()}</p>
                            <button className="btn btn-primary" onClick={handleChangePassword}>
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header">
                            <h5>Active Sessions</h5>
                        </div>
                        <div className="card-body">
                            {isLoading ? (
                                <div className="text-center">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : activeSessions.length === 0 ? (
                                <p>No active sessions found</p>
                            ) : (
                                <div className="list-group">
                                    {activeSessions.map((session) => (
                                        <div key={session.id} className="list-group-item">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <strong>{formatDeviceInfo(session.deviceInfo)}</strong>
                                                    <div className="text-muted small">
                                                        IP: {session.ipAddress || 'Unknown'}
                                                    </div>
                                                    <div className="text-muted small">
                                                        Logged in: {formatDate(session.createdAt)}
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleRevokeSession(session.id)}
                                                    disabled={session.id === user.currentSessionId}
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
            </div>
        </div>
    );
};

export default Profile;