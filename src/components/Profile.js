import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import {apiRequest, formatDate, formatDeviceInfo} from "./Utils";
import {Dropdown} from "react-bootstrap";

const Profile = ({ user: currentUser, darkMode }) => {
    const { id } = useParams();
    const [profileUser, setProfileUser] = useState(null);
    const [activeSessions, setActiveSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCurrentUser, setIsCurrentUser] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [availableRoles, setAvailableRoles] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setIsLoading(true);

                // Determine if we're viewing our own profile
                const viewingOwnProfile = !id || id === currentUser?.id;
                setIsCurrentUser(viewingOwnProfile);
                const adminStatus = currentUser?.roles?.includes('admin');
                setIsAdmin(adminStatus);

                // Fetch the profile user data
                const userId = viewingOwnProfile ? currentUser.id : id;
                const data = await apiRequest(`user/${userId}`, "GET", localStorage.getItem("token"));
                setProfileUser(data);

                // Only fetch sessions for current user or if admin
                if (viewingOwnProfile || adminStatus) {
                    await fetchActiveSessions(userId, adminStatus);
                }

                // Fetch available roles if admin
                if (adminStatus && !viewingOwnProfile) {
                    await fetchAvailableRoles();
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
        }
    }, [id, currentUser]);

    const fetchAvailableRoles = async () => {
        try {
            const rolesData = await apiRequest("admin/roles", "GET", localStorage.getItem("token"));
            // Extract just the role names from the array of objects
            const roles = rolesData.map(role => role.name);
            setAvailableRoles(roles);
        } catch (error) {
            console.error("Error fetching available roles:", error);
            toast.error("Failed to load available roles");
        }
    };

    const handleRoleChange = async (roleName, action) => {
        try {
            await apiRequest(`admin/users/${profileUser.id}/roles`, "POST", localStorage.getItem("token"), { roleName, action });

            // Update local state
            setProfileUser(prev => {
                const currentRoles = prev.roles || [];
                const updatedRoles = action === "add"
                    ? [...currentRoles, roleName]
                    : currentRoles.filter(role => role !== roleName);

                return { ...prev, roles: updatedRoles };
            });

            toast.success(`Role ${action === "add" ? "added" : "removed"} successfully`);
        } catch (error) {
            console.error("Error updating roles:", error);
            toast.error(error.message || "Failed to update roles");
        }
    };

    const fetchActiveSessions = async (userId, isAdminCheck) => {
        try {
            // If admin and viewing another user's profile, fetch that user's sessions
            const data = await apiRequest(`auth/sessions?userId=${userId}`, "GET", localStorage.getItem("token"));
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
                (isCurrentUser ? '<input id="old-password" type="password" class="swal2-input" placeholder="Old Password">' : '') +
                '<input id="new-password" type="password" class="swal2-input" placeholder="New Password">' +
                '<input id="confirm-password" type="password" class="swal2-input" placeholder="Confirm New Password">',
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                const oldPassword = isCurrentUser ? document.getElementById("old-password").value : null;
                const newPassword = document.getElementById("new-password").value;
                const confirmPassword = document.getElementById("confirm-password").value;

                if (isCurrentUser && !oldPassword) {
                    Swal.showValidationMessage("Old password is required");
                    return false;
                }

                if (!newPassword || !confirmPassword) {
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
                const endpoint = isAdmin && !isCurrentUser
                    ? `admin/change-password/${profileUser.id}`
                    : "user/change-password";

                await apiRequest(endpoint, "POST", localStorage.getItem("token"), formValues);
                Swal.fire("Success", "Password changed successfully!", "success");
            } catch (error) {
                Swal.fire("Error", error.message || "Something went wrong", "error");
            }
        }
    };

    const handleToggleAccountStatus = async () => {
        try {
            const result = await Swal.fire({
                title: `Are you sure you want to ${profileUser.enabled ? 'disable' : 'enable'} this account?`,
                text: profileUser.enabled
                    ? "The user will be logged out and unable to log back in until re-enabled."
                    : "The user will be able to log in and use the system again.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: `Yes, ${profileUser.enabled ? 'disable' : 'enable'} it!`
            });

            if (result.isConfirmed) {
                await apiRequest(
                    `admin/users/${profileUser.id}/status`,
                    "POST",
                    localStorage.getItem("token"),
                    { enabled: !profileUser.enabled }
                );

                setProfileUser(prev => ({ ...prev, enabled: !prev.enabled }));
                toast.success(`Account ${profileUser.enabled ? 'disabled' : 'enabled'} successfully`);
            }
        } catch (error) {
            console.error("Error toggling account status:", error);
            toast.error(error.message || "Failed to toggle account status");
        }
    };

    const handleBanUser = async () => {
        const { value: formValues } = await Swal.fire({
            title: profileUser.isBanned ? 'Unban User' : 'Ban User',
            html:
                !profileUser.isBanned ?
                    `<input id="ban-reason" class="swal2-input" placeholder="Reason (optional)">
             <input id="ban-duration" type="number" min="1" class="swal2-input" placeholder="Duration in minutes (leave empty for permanent)">
             <div class="small text-muted mt-1">Common durations: 1440 (1 day), 10080 (1 week), 43200 (1 month)</div>` :
                    'Are you sure you want to unban this user?',
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                if (profileUser.isBanned) return true;

                const reason = document.getElementById("ban-reason").value;
                const durationInput = document.getElementById("ban-duration").value;
                const duration = durationInput ? parseInt(durationInput) : null;

                if (durationInput && isNaN(duration)) {
                    Swal.showValidationMessage("Please enter a valid number for duration");
                    return false;
                }

                return { reason, duration };
            }
        });

        if (formValues) {
            try {
                if (profileUser.isBanned) {
                    await apiRequest(
                        `admin/unban/${profileUser.id}`,
                        "POST",
                        localStorage.getItem("token")
                    );
                    setProfileUser(prev => ({ ...prev, isBanned: false, banReason: null, banExpiresAt: null }));
                    toast.success("User unbanned successfully");
                } else {
                    await apiRequest(`admin/ban/${profileUser.id}`, "POST", localStorage.getItem("token"), formValues);
                    setProfileUser(prev => ({
                        ...prev,
                        isBanned: true,
                        banReason: formValues.reason || "No reason provided",
                        banExpiresAt: formValues.duration ?
                            new Date(Date.now() + formValues.duration * 60 * 1000).toISOString() :
                            null
                    }));
                    toast.success("User banned successfully");
                }
            } catch (error) {
                toast.error(error.message || "Failed to process ban/unban request");
            }
        }
    };

    const handleMuteUser = async () => {
        const { value: formValues } = await Swal.fire({
            title: profileUser.isMuted ? 'Unmute User' : 'Mute User',
            html:
                !profileUser.isMuted ?
                    `<input id="mute-reason" class="swal2-input" placeholder="Reason (optional)">
             <input id="mute-duration" type="number" min="1" class="swal2-input" placeholder="Duration in minutes (leave empty for permanent)">
             <div class="small text-muted mt-1">Common durations: 60 (1 hour), 1440 (1 day), 10080 (1 week)</div>` :
                    'Are you sure you want to unmute this user?',
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                if (profileUser.isMuted) return true;

                const reason = document.getElementById("mute-reason").value;
                const durationInput = document.getElementById("mute-duration").value;
                const duration = durationInput ? parseInt(durationInput) : null;

                if (durationInput && isNaN(duration)) {
                    Swal.showValidationMessage("Please enter a valid number for duration");
                    return false;
                }

                return { reason, duration };
            }
        });

        if (formValues) {
            try {
                if (profileUser.isMuted) {
                    await apiRequest(`admin/unmute/${profileUser.id}`, "POST", localStorage.getItem("token"));
                    setProfileUser(prev => ({ ...prev, isMuted: false, muteReason: null, muteExpiresAt: null }));
                    toast.success("User unmuted successfully");
                } else {
                    await apiRequest(`admin/mute/${profileUser.id}`, "POST", localStorage.getItem("token"), formValues);
                    setProfileUser(prev => ({
                        ...prev,
                        isMuted: true,
                        muteReason: formValues.reason || "No reason provided",
                        muteExpiresAt: formValues.duration ?
                            new Date(Date.now() + formValues.duration * 60 * 1000).toISOString() :
                            null
                    }));
                    toast.success("User muted successfully");
                }
            } catch (error) {
                toast.error(error.message || "Failed to process mute/unmute request");
            }
        }
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
                            <div className="mb-3">
                                <div className="d-flex align-items-center flex-wrap gap-2">
                                    <strong>Roles:</strong>
                                    {profileUser.roles?.length > 0 ? (
                                        profileUser.roles.map(role => {
                                            const roleName = typeof role === 'object' ? role.name : role;
                                            return (
                                                <div key={roleName} className={`d-flex align-items-center gap-1 rounded-pill px-2 py-1 ${darkMode ? "bg-dark-subtle" : "bg-light"}`}>
                                                    <span className={darkMode ? "text-white" : ""}>{roleName}</span>
                                                    {isAdmin && !isCurrentUser && (
                                                        <button
                                                            className="btn btn-sm btn-danger p-0 d-flex align-items-center justify-content-center"
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                fontSize: '0.7rem'
                                                            }}
                                                            onClick={() => handleRoleChange(roleName, "remove")}
                                                            aria-label={`Remove ${roleName} role`}
                                                        >
                                                            <i className="bi bi-x"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <span className={`${darkMode ? "text-light" : "text-muted"}`}>No roles assigned</span>
                                    )}
                                    {isAdmin && !isCurrentUser && (
                                        <Dropdown>
                                            <Dropdown.Toggle
                                                variant="primary"
                                                size="sm"
                                                className="d-flex align-items-center"
                                            >
                                                <i className="bi bi-plus-lg me-1"></i> Add Role
                                            </Dropdown.Toggle>

                                            <Dropdown.Menu className={darkMode ? 'bg-dark' : ''}>
                                                {availableRoles.length > 0 ? (
                                                    availableRoles
                                                        .filter(availableRole => {
                                                            const currentRoleNames = profileUser.roles?.map(r => typeof r === 'object' ? r.name : r);
                                                            return !currentRoleNames?.includes(availableRole);
                                                        })
                                                        .map(role => (
                                                            <Dropdown.Item
                                                                key={role}
                                                                className={darkMode ? 'text-light' : ''}
                                                                onClick={() => handleRoleChange(role, "add")}
                                                            >
                                                                {role}
                                                            </Dropdown.Item>
                                                        ))
                                                ) : (
                                                    <Dropdown.ItemText className="disabled">No roles available</Dropdown.ItemText>
                                                )}
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    )}
                                </div>
                            </div>
                            <p><strong>Gender:</strong> {profileUser.gender}</p>
                            <p><strong>Birthdate:</strong> {new Date(profileUser.birthdate).toLocaleDateString()}</p>
                            <p><strong>Account Created:</strong> {new Date(profileUser.createdAt).toLocaleString()}</p>
                            <p>
                                <strong>Account Status:</strong> {profileUser.enabled ?
                                <span className="text-success">Enabled</span> :
                                <span className="text-danger">Disabled</span>}
                            </p>

                            <p>
                                <strong>Forum Posts:</strong> {profileUser.forumMessagesCount || 0}
                            </p>

                            <p>
                                <strong>Chat Messages:</strong> {profileUser.chatMessagesCount || 0}
                            </p>

                            <p>
                                <strong>Ban Status: </strong>
                                {profileUser.isBanned ? (
                                    <>
                                        <span className="text-danger">
                                            {profileUser.banExpiresAt === null ? 'Permanently Banned' :
                                                `Banned until ${new Date(profileUser.banExpiresAt).toLocaleString()}`}
                                        </span>
                                        {profileUser.banReason && (
                                            <div className={`small ${darkMode ? "text-light" : "text-muted"}`}>
                                                Reason: {profileUser.banReason}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-success">Not Banned</span>
                                )}
                            </p>

                            <p>
                                <strong>Mute Status: </strong>
                                {profileUser.isMuted ? (
                                    <>
                                        <span className="text-warning">
                                            {profileUser.muteExpiresAt === null ? 'Permanently Muted' :
                                                `Muted until ${new Date(profileUser.muteExpiresAt).toLocaleString()}`}
                                        </span>
                                        {profileUser.muteReason && (
                                            <div className={`small ${darkMode ? "text-light" : "text-muted"}`}>
                                                Reason: {profileUser.muteReason}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-success">Not Muted</span>
                                )}
                            </p>

                            {(isCurrentUser || isAdmin) && (
                                <button
                                    className={`btn ${darkMode ? "btn-light" : "btn-primary"} me-2 mb-2`}
                                    onClick={handleChangePassword}
                                >
                                    Change Password
                                </button>
                            )}

                            {isAdmin && !isCurrentUser && (
                                <>
                                    <button
                                        className={`btn ${profileUser.enabled ? "btn-warning" : "btn-success"} me-2 mb-2`}
                                        onClick={handleToggleAccountStatus}
                                    >
                                        {profileUser.enabled ? 'Disable Account' : 'Enable Account'}
                                    </button>
                                    <button
                                        className={`btn ${profileUser.isBanned ? "btn-success" : "btn-danger"} me-2 mb-2`}
                                        onClick={handleBanUser}
                                    >
                                        {profileUser.isBanned ? 'Unban User' : 'Ban User'}
                                    </button>
                                    <button
                                        className={`btn ${profileUser.isMuted ? "btn-success" : "btn-warning"} me-2 mb-2`}
                                        onClick={handleMuteUser}
                                    >
                                        {profileUser.isMuted ? 'Unmute User' : 'Mute User'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {(isCurrentUser || isAdmin) && (
                    <div className="col-md-6">
                        <div className={`card ${darkMode ? "bg-dark" : ""}`}>
                            <div className={`card-header ${darkMode ? "bg-secondary" : ""}`}>
                                <h5>Active Sessions</h5>
                            </div>
                            <div className="card-body">
                                {activeSessions?.length === 0 ? (
                                    <p>No active sessions found</p>
                                ) : (
                                    <div className="list-group">
                                        {activeSessions?.map((session) => (
                                            <div
                                                key={session.id}
                                                className={`list-group-item ${darkMode ? "bg-dark text-white" : ""}`}
                                            >
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        {isAdmin && !isCurrentUser && (
                                                            <div className="small mb-1">
                                                                <strong>User: </strong>{profileUser.username}
                                                            </div>
                                                        )}
                                                        <strong>{formatDeviceInfo(session.deviceInfo)}</strong>
                                                        <div className={`small ${darkMode ? "text-light" : "text-muted"}`}>
                                                            IP: {session.ipAddress || 'Unknown'}
                                                        </div>
                                                        <div className={`small ${darkMode ? "text-light" : "text-muted"}`}>
                                                            Logged in: {formatDate(session.createdAt)}
                                                        </div>
                                                    </div>
                                                    {(isAdmin || isCurrentUser) && (
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => handleRevokeSession(session.id)}
                                                            disabled={session.id === currentUser?.currentSessionId && isCurrentUser}
                                                        >
                                                            Revoke
                                                        </button>
                                                    )}
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