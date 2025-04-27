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
export {apiRequest, decodeHtml, formatDeviceInfo, formatDate};