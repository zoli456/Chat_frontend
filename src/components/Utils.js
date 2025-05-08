import Swal from "sweetalert2";

const apiRequest = async (endpoint, method = "GET", token, body = null) => {
    try {
        const response = await fetch(`${process.env.REACT_APP_BASE_URL}/api/${endpoint}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: body ? JSON.stringify(body) : null,
        });

        if (!response.ok) throw new Error(`Failed: ${response.statusText}`);

        return response.json();
    } catch (error) {
        console.error(`API Request Error (${method} ${endpoint}):`, error);
        throw error;
    }
};

const decodeHtml = (html) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
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

const showAlert = (title, text, icon) => {
    Swal.fire({ title, text, icon });
};

const showConfirm = async (title, text, confirmButtonText) => {
    const result = await Swal.fire({
        title,
        text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText: "Cancel",
    });
    return result.isConfirmed;
};

const banUser = async (userId, token, apiRequest) => {
    const reasonResult = await Swal.fire({
        title: "Ban User",
        input: "text",
        inputLabel: "Enter reason",
        showCancelButton: true,
    });
    if (reasonResult.isDismissed) { return false; }

    const durationResult = await Swal.fire({
        title: "Ban Duration",
        input: "number",
        inputLabel: "Enter duration in minutes (leave empty for permanent)",
        showCancelButton: true,
    });
    if (durationResult.isDismissed) { return false; }

    const reason = reasonResult.value;
    const duration = durationResult.value;

    if (duration && (isNaN(duration) || duration <= 0)) {
        showAlert("Invalid Input", "Please enter a valid number of minutes.", "error");
        return false;
    }

    try {
        await apiRequest(`admin/ban/${userId}`, "POST", token, { reason, duration });
        showAlert("Success", `User has been banned for ${duration ? duration + " minutes" : "permanently"}.`, "success");
        return true;
    } catch (error) {
        console.error("Error banning user:", error);
        return false;
    }
};

const unbanUser = async (userId, token, apiRequest) => {
    const confirmed = await showConfirm("Unban User", "Are you sure you want to unban this user?", "Unban");
    if (!confirmed) return false;

    try {
        await apiRequest(`admin/unban/${userId}`, "POST", token);
        showAlert("User Unbanned", "User has been unbanned.", "success");
        return true;
    } catch (error) {
        console.error("Error unbanning user:", error);
        return false;
    }
};

const muteUser = async (userId, token, apiRequest) => {
    const reasonResult = await Swal.fire({
        title: "Mute User",
        input: "text",
        inputLabel: "Enter reason",
        showCancelButton: true,
    });
    if (reasonResult.isDismissed) { return false; }

    const durationResult = await Swal.fire({
        title: "Mute Duration",
        input: "number",
        inputLabel: "Enter duration in minutes (leave empty for permanent)",
        showCancelButton: true,
    });
    if (durationResult.isDismissed) { return false; }

    const reason = reasonResult.value;
    const duration = durationResult.value;

    if (duration && (isNaN(duration) || duration <= 0)) {
        showAlert("Invalid Input", "Please enter a valid number of minutes.", "error");
        return false;
    }

    try {
        await apiRequest(`admin/mute/${userId}`, "POST", token, { reason, duration });
        showAlert("User Muted", `User has been muted for ${duration ? duration + " minutes" : "permanently"}.`, "success");
        return true;
    } catch (error) {
        console.error("Error muting user:", error);
        return false;
    }
};

const unmuteUser = async (userId, token, apiRequest) => {
    const confirmed = await showConfirm("Unmute User", "Are you sure you want to unmute this user?", "Unmute");
    if (!confirmed) return false;

    try {
        await apiRequest(`admin/unmute/${userId}`, "POST", token);
        showAlert("User Unmuted", "User has been unmuted.", "success");
        return true;
    } catch (error) {
        console.error("Error unmuting user:", error);
        return false;
    }
};

const kickUser = async (userId, token, apiRequest) => {
    const confirmed = await showConfirm("Kick User", "Are you sure you want to kick this user?", "Kick");
    if (!confirmed) return false;

    try {
        await apiRequest(`admin/kick/${userId}`, "POST", token);
        showAlert("Success", "User has been kicked from the chat.", "success");
        return true;
    } catch (error) {
        console.error("Error kicking user:", error);
        return false;
    }
};

export {apiRequest, decodeHtml, formatDeviceInfo, formatDate, banUser, unbanUser, muteUser, unmuteUser, kickUser, showConfirm};