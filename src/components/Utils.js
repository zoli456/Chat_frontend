const Swal = require("sweetalert2");
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
module.exports = {apiRequest}