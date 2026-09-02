const API_BASE = "../api/";

/**
 * Universal API Request Handler
 * @param {string} endpoint - API file endpoint (e.g. 'suppliers.php')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 */
async function apiRequest(endpoint, options = {}) {
    const config = {
        method: options.method || (options.body ? "POST" : "GET"),
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    };

    try {
        const response = await fetch(API_BASE + endpoint, config);
        const text = await response.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch (error) {
            console.error("Server Raw Response:", text);
            throw new Error("Invalid response format from server.");
        }

        if (!response.ok || data.success === false) {
            throw new Error(data.message || "API request failed.");
        }

        return data;
    } catch (error) {
        console.error("API Request Error:", error);
        throw error;
    }
}

/* HELPER API WRAPPERS */

// Fetch all suppliers
async function getSuppliers() {
    return await apiRequest("suppliers.php");
}

// Create a new supplier
async function createSupplier(supplierData) {
    return await apiRequest("suppliers.php", {
        method: "POST",
        body: JSON.stringify({
            action: "create",
            supplier: supplierData
        })
    });
}

// Fetch all items
async function getItems() {
    return await apiRequest("items.php");
}

// Create a new item
async function createItem(itemData) {
    return await apiRequest("items.php", {
        method: "POST",
        body: JSON.stringify(itemData)
    });
}