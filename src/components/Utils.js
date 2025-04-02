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
export {apiRequest, decodeHtml};