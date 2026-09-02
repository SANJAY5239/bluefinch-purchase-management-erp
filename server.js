const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, "data");

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Serve static frontend files
app.use(express.static(__dirname));

// ─── HELPERS ────────────────────────────────────────────────────────────────

function readJsonFile(filename) {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) return [];
    try {
        const content = fs.readFileSync(filepath, "utf-8");
        const data = JSON.parse(content);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function writeJsonFile(filename, data) {
    const filepath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 4), "utf-8");
}

function jsonResponse(res, success, data = [], message = "", status = 200) {
    return res.status(status).json({ success, data, message });
}

function validateRequired(data, fields) {
    for (const field of fields) {
        if (data[field] === undefined || data[field] === null || String(data[field]).trim() === "") {
            return field;
        }
    }
    return null;
}

function findIndex(data, id) {
    return data.findIndex(row => String(row.id) === String(id));
}

function generateCode(data, field, prefix) {
    let max = 0;
    for (const row of data) {
        if (row[field]) {
            const match = String(row[field]).match(/(\d+)$/);
            if (match) {
                max = Math.max(max, parseInt(match[1], 10));
            }
        }
    }
    return prefix + String(max + 1).padStart(4, "0");
}

function now() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function today() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD API
// ═══════════════════════════════════════════════════════════════════════════

app.get("/api/dashboard.php", (req, res) => {
    const orders = readJsonFile("purchase_orders.json");
    let total = orders.length;
    let draft = 0, pending = 0, completed = 0, cancelled = 0, totalValue = 0;

    for (const order of orders) {
        const status = (order.status || "").toLowerCase();
        if (status === "draft") draft++;
        else if (status === "pending") pending++;
        else if (status === "completed") completed++;
        else if (status === "cancelled") cancelled++;
        totalValue += parseFloat(order.grand_total || 0);
    }

    jsonResponse(res, true, { total, draft, pending, completed, cancelled, total_value: totalValue });
});

// ═══════════════════════════════════════════════════════════════════════════
// ITEMS API
// ═══════════════════════════════════════════════════════════════════════════

const ITEMS_FILE = "items.json";

app.get("/api/items.php", (req, res) => {
    let items = readJsonFile(ITEMS_FILE);
    const { search, category, status, id } = req.query;

    if (id !== undefined && id !== "") {
        const idx = findIndex(items, id);
        if (idx < 0) return jsonResponse(res, false, [], "Item not found.", 404);
        return jsonResponse(res, true, items[idx]);
    }

    if (search) {
        const s = search.toLowerCase();
        items = items.filter(item => JSON.stringify(item).toLowerCase().includes(s));
    }
    if (category) {
        items = items.filter(item => (item.category || "").toLowerCase() === category.toLowerCase());
    }
    if (status) {
        items = items.filter(item => (item.status || "").toLowerCase() === status.toLowerCase());
    }

    jsonResponse(res, true, items);
});

app.post("/api/items.php", (req, res) => {
    const items = readJsonFile(ITEMS_FILE);
    const data = req.body;

    const missing = validateRequired(data, ["name", "category", "unit", "purchase_price", "tax", "status"]);
    if (missing) return jsonResponse(res, false, [], `Field '${missing}' is required.`, 422);

    const name = String(data.name).trim();
    const duplicate = items.find(e => e.name && e.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return jsonResponse(res, false, [], `An item with the name '${name}' already exists.`, 422);

    const purchasePrice = parseFloat(data.purchase_price);
    const tax = parseFloat(data.tax);
    if (purchasePrice < 0 || tax < 0) return jsonResponse(res, false, [], "Price and tax cannot be negative.", 422);

    const ids = items.map(i => i.id || 0);
    data.id = ids.length ? Math.max(...ids) + 1 : 1;

    if (data.code && String(data.code).trim()) {
        const code = String(data.code).trim();
        const codeDup = items.find(e => (e.code || "").toLowerCase() === code.toLowerCase());
        if (codeDup) return jsonResponse(res, false, [], `Item code '${code}' already exists.`, 422);
        data.code = code;
    } else {
        data.code = generateCode(items, "code", "ITM");
    }

    data.name = name;
    data.description = (data.description || "").trim();
    data.category = String(data.category).trim();
    data.unit = String(data.unit).trim();
    data.purchase_price = purchasePrice;
    data.tax = tax;
    data.status = String(data.status).trim();
    data.created_at = now();

    items.push(data);
    writeJsonFile(ITEMS_FILE, items);
    jsonResponse(res, true, data, "Item created successfully.");
});

app.put("/api/items.php", (req, res) => {
    const items = readJsonFile(ITEMS_FILE);
    const data = req.body;

    if (!data.id) return jsonResponse(res, false, [], "Item ID is required.", 422);

    const index = findIndex(items, data.id);
    if (index < 0) return jsonResponse(res, false, [], "Item not found.", 404);

    const missing = validateRequired(data, ["name", "category", "unit", "purchase_price", "tax", "status"]);
    if (missing) return jsonResponse(res, false, [], `Field '${missing}' is required.`, 422);

    const name = String(data.name).trim();
    const currentId = data.id;
    const duplicate = items.find(e => String(e.id) !== String(currentId) && e.name && e.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return jsonResponse(res, false, [], `Another item with the name '${name}' already exists.`, 422);

    const purchasePrice = parseFloat(data.purchase_price);
    const tax = parseFloat(data.tax);
    if (purchasePrice < 0 || tax < 0) return jsonResponse(res, false, [], "Price and tax cannot be negative.", 422);

    data.code = items[index].code;
    data.name = name;
    data.description = (data.description || "").trim();
    data.category = String(data.category).trim();
    data.unit = String(data.unit).trim();
    data.purchase_price = purchasePrice;
    data.tax = tax;
    data.status = String(data.status).trim();
    data.created_at = items[index].created_at || now();
    data.updated_at = now();

    items[index] = data;
    writeJsonFile(ITEMS_FILE, items);
    jsonResponse(res, true, data, "Item updated successfully.");
});

app.delete("/api/items.php", (req, res) => {
    const items = readJsonFile(ITEMS_FILE);
    const id = req.query.id || "";
    const index = findIndex(items, id);
    if (index < 0) return jsonResponse(res, false, [], "Item not found.", 404);
    items.splice(index, 1);
    writeJsonFile(ITEMS_FILE, items);
    jsonResponse(res, true, [], "Item deleted successfully.");
});

// ═══════════════════════════════════════════════════════════════════════════
// ITEM CATEGORIES API
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORIES_FILE = "item_categories.json";

function attachItemCounts(categories, items) {
    const counts = {};
    for (const item of items) {
        const cat = (item.category || "").trim();
        if (cat) counts[cat] = (counts[cat] || 0) + 1;
    }
    return categories.map(c => ({
        ...c,
        item_count: counts[(c.name || "").trim()] || 0
    }));
}

app.get("/api/item_categories.php", (req, res) => {
    let categories = readJsonFile(CATEGORIES_FILE);
    const items = readJsonFile(ITEMS_FILE);
    const { search, status } = req.query;

    let result = attachItemCounts(categories, items);

    if (search) {
        const s = search.toLowerCase();
        result = result.filter(cat => JSON.stringify(cat).toLowerCase().includes(s));
    }
    if (status) {
        result = result.filter(cat => (cat.status || "").toLowerCase() === status.toLowerCase());
    }

    jsonResponse(res, true, result);
});

app.post("/api/item_categories.php", (req, res) => {
    const categories = readJsonFile(CATEGORIES_FILE);
    const data = req.body;

    const missing = validateRequired(data, ["name", "status"]);
    if (missing) return jsonResponse(res, false, [], `Field '${missing}' is required.`, 422);

    const name = String(data.name).trim();
    const duplicate = categories.find(e => e.name && e.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return jsonResponse(res, false, [], `A category with the name '${name}' already exists.`, 422);

    const ids = categories.map(c => c.id || 0);
    data.id = ids.length ? Math.max(...ids) + 1 : 1;
    data.code = generateCode(categories, "code", "CAT");
    data.name = name;
    data.description = (data.description || "").trim();
    data.status = (data.status || "Active").trim();
    data.created_at = now();

    categories.push(data);
    writeJsonFile(CATEGORIES_FILE, categories);

    data.item_count = 0;
    jsonResponse(res, true, data, "Category created successfully.");
});

app.put("/api/item_categories.php", (req, res) => {
    const categories = readJsonFile(CATEGORIES_FILE);
    const items = readJsonFile(ITEMS_FILE);
    const data = req.body;

    if (!data.id) return jsonResponse(res, false, [], "Category ID is required.", 422);
    const index = findIndex(categories, data.id);
    if (index < 0) return jsonResponse(res, false, [], "Category not found.", 404);

    const missing = validateRequired(data, ["name", "status"]);
    if (missing) return jsonResponse(res, false, [], `Field '${missing}' is required.`, 422);

    const name = String(data.name).trim();
    const currentId = data.id;
    const duplicate = categories.find(e => String(e.id) !== String(currentId) && e.name && e.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return jsonResponse(res, false, [], `Another category with the name '${name}' already exists.`, 422);

    const oldName = categories[index].name;

    data.code = categories[index].code;
    data.name = name;
    data.description = (data.description || "").trim();
    data.status = (data.status || "Active").trim();
    data.created_at = categories[index].created_at || now();
    data.updated_at = now();

    // If name changed, update items using this category
    if (oldName !== name) {
        let itemsChanged = false;
        for (const item of items) {
            if ((item.category || "").toLowerCase() === oldName.toLowerCase()) {
                item.category = name;
                itemsChanged = true;
            }
        }
        if (itemsChanged) writeJsonFile(ITEMS_FILE, items);
    }

    categories[index] = data;
    writeJsonFile(CATEGORIES_FILE, categories);
    jsonResponse(res, true, data, "Category updated successfully.");
});

app.delete("/api/item_categories.php", (req, res) => {
    const categories = readJsonFile(CATEGORIES_FILE);
    const items = readJsonFile(ITEMS_FILE);
    const id = req.query.id || "";
    const index = findIndex(categories, id);
    if (index < 0) return jsonResponse(res, false, [], "Category not found.", 404);

    const categoryName = categories[index].name;
    const assignedCount = items.filter(it => (it.category || "").toLowerCase() === categoryName.toLowerCase()).length;
    if (assignedCount > 0) {
        return jsonResponse(res, false, [], `Cannot delete category '${categoryName}' because it is assigned to ${assignedCount} item(s). Please reassign or delete those items first.`, 400);
    }

    categories.splice(index, 1);
    writeJsonFile(CATEGORIES_FILE, categories);
    jsonResponse(res, true, [], "Category deleted successfully.");
});

// ═══════════════════════════════════════════════════════════════════════════
// UNITS OF MEASUREMENT API
// ═══════════════════════════════════════════════════════════════════════════

const UNITS_FILE = "units.json";

function attachUnitCounts(units, items) {
    const counts = {};
    for (const item of items) {
        const u = (item.unit || "").trim().toLowerCase();
        if (u) counts[u] = (counts[u] || 0) + 1;
    }
    return units.map(unit => {
        const nameKey = (unit.name || "").trim().toLowerCase();
        const shortKey = (unit.short_name || "").trim().toLowerCase();
        return {
            ...unit,
            item_count: (counts[shortKey] || 0) + (counts[nameKey] || 0)
        };
    });
}

app.get("/api/units.php", (req, res) => {
    let units = readJsonFile(UNITS_FILE);
    const items = readJsonFile(ITEMS_FILE);
    const { search, status } = req.query;

    let result = attachUnitCounts(units, items);

    if (search) {
        const s = search.toLowerCase();
        result = result.filter(u => JSON.stringify(u).toLowerCase().includes(s));
    }
    if (status) {
        result = result.filter(u => (u.status || "").toLowerCase() === status.toLowerCase());
    }

    jsonResponse(res, true, result);
});

app.post("/api/units.php", (req, res) => {
    const units = readJsonFile(UNITS_FILE);
    const data = req.body;

    const missing = validateRequired(data, ["name", "short_name", "status"]);
    if (missing) return jsonResponse(res, false, [], `Field '${missing}' is required.`, 422);

    const name = String(data.name).trim();
    const shortName = String(data.short_name).trim().toUpperCase();

    for (const existing of units) {
        if (existing.name && existing.name.toLowerCase() === name.toLowerCase()) {
            return jsonResponse(res, false, [], `A unit with the name '${name}' already exists.`, 422);
        }
        if (existing.short_name && existing.short_name.toLowerCase() === shortName.toLowerCase()) {
            return jsonResponse(res, false, [], `A unit with the short code '${shortName}' already exists.`, 422);
        }
    }

    const ids = units.map(u => u.id || 0);
    data.id = ids.length ? Math.max(...ids) + 1 : 1;
    data.code = generateCode(units, "code", "UOM");
    data.name = name;
    data.short_name = shortName;
    data.description = (data.description || "").trim();
    data.status = (data.status || "Active").trim();
    data.created_at = now();

    units.push(data);
    writeJsonFile(UNITS_FILE, units);

    data.item_count = 0;
    jsonResponse(res, true, data, "Unit of Measurement created successfully.");
});

app.put("/api/units.php", (req, res) => {
    const units = readJsonFile(UNITS_FILE);
    const items = readJsonFile(ITEMS_FILE);
    const data = req.body;

    if (!data.id) return jsonResponse(res, false, [], "Unit ID is required.", 422);
    const index = findIndex(units, data.id);
    if (index < 0) return jsonResponse(res, false, [], "Unit not found.", 404);

    const missing = validateRequired(data, ["name", "short_name", "status"]);
    if (missing) return jsonResponse(res, false, [], `Field '${missing}' is required.`, 422);

    const name = String(data.name).trim();
    const shortName = String(data.short_name).trim().toUpperCase();
    const currentId = data.id;

    for (const existing of units) {
        if (String(existing.id) !== String(currentId)) {
            if (existing.name && existing.name.toLowerCase() === name.toLowerCase()) {
                return jsonResponse(res, false, [], `Another unit with the name '${name}' already exists.`, 422);
            }
            if (existing.short_name && existing.short_name.toLowerCase() === shortName.toLowerCase()) {
                return jsonResponse(res, false, [], `Another unit with the short code '${shortName}' already exists.`, 422);
            }
        }
    }

    const oldShort = units[index].short_name;
    data.code = units[index].code;
    data.name = name;
    data.short_name = shortName;
    data.description = (data.description || "").trim();
    data.status = (data.status || "Active").trim();
    data.created_at = units[index].created_at || now();
    data.updated_at = now();

    // If short_name changed, update items
    if (oldShort !== shortName) {
        let itemsChanged = false;
        for (const item of items) {
            if ((item.unit || "").toLowerCase() === oldShort.toLowerCase()) {
                item.unit = shortName;
                itemsChanged = true;
            }
        }
        if (itemsChanged) writeJsonFile(ITEMS_FILE, items);
    }

    units[index] = data;
    writeJsonFile(UNITS_FILE, units);
    jsonResponse(res, true, data, "Unit of Measurement updated successfully.");
});

app.delete("/api/units.php", (req, res) => {
    const units = readJsonFile(UNITS_FILE);
    const items = readJsonFile(ITEMS_FILE);
    const id = req.query.id || "";
    const index = findIndex(units, id);
    if (index < 0) return jsonResponse(res, false, [], "Unit not found.", 404);

    const shortName = units[index].short_name;
    const unitName = units[index].name;
    const assignedCount = items.filter(it => {
        const u = (it.unit || "").trim().toLowerCase();
        return u === shortName.toLowerCase() || u === unitName.toLowerCase();
    }).length;

    if (assignedCount > 0) {
        return jsonResponse(res, false, [], `Cannot delete unit '${unitName} (${shortName})' because it is assigned to ${assignedCount} item(s). Please reassign or update those items first.`, 400);
    }

    units.splice(index, 1);
    writeJsonFile(UNITS_FILE, units);
    jsonResponse(res, true, [], "Unit of Measurement deleted successfully.");
});

// ═══════════════════════════════════════════════════════════════════════════
// SUPPLIERS API
// ═══════════════════════════════════════════════════════════════════════════

const SUPPLIERS_FILE = "suppliers.json";

// Ensure data file exists
if (!fs.existsSync(path.join(DATA_DIR, SUPPLIERS_FILE))) {
    writeJsonFile(SUPPLIERS_FILE, []);
}

app.get("/api/suppliers.php", (req, res) => {
    const suppliers = readJsonFile(SUPPLIERS_FILE);
    jsonResponse(res, true, suppliers, "Suppliers loaded successfully");
});

// Suppliers page uses POST with action field for create/update/delete
app.post("/api/suppliers.php", (req, res) => {
    const input = req.body;
    const action = input.action || "";
    let suppliers = readJsonFile(SUPPLIERS_FILE);

    // ─── CREATE ─────────────────────────────────────────────
    if (action === "create") {
        const supplier = input.supplier || {};
        const required = ["name", "contact_person", "phone", "email", "address", "payment_terms", "status"];
        for (const field of required) {
            if (!supplier[field] || String(supplier[field]).trim() === "") {
                const label = field.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());
                return res.json({ success: false, message: `${label} is required`, data: [] });
            }
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(supplier.email)) {
            return res.json({ success: false, message: "Invalid email address", data: [] });
        }

        // Phone validation
        const phoneRegex = /^[0-9+\-\s]{7,15}$/;
        if (!phoneRegex.test(supplier.phone)) {
            return res.json({ success: false, message: "Invalid phone number", data: [] });
        }

        // Generate ID
        let maxId = 0;
        for (const e of suppliers) {
            const eid = parseInt(e.id || 0, 10);
            if (eid > maxId) maxId = eid;
        }

        // Generate code
        let maxCodeNum = 0;
        for (const e of suppliers) {
            const code = e.code || e.supplier_code || "";
            const match = String(code).match(/(\d+)$/);
            if (match) maxCodeNum = Math.max(maxCodeNum, parseInt(match[1], 10));
        }

        const newSupplier = {
            id: maxId + 1,
            code: "SUP" + String(maxCodeNum + 1).padStart(4, "0"),
            name: String(supplier.name).trim(),
            contact_person: String(supplier.contact_person).trim(),
            phone: String(supplier.phone).trim(),
            email: String(supplier.email).trim(),
            address: String(supplier.address).trim(),
            tax_number: (supplier.tax_number || "").trim(),
            payment_terms: String(supplier.payment_terms).trim(),
            group: (supplier.group || supplier.supplier_group || "General").trim(),
            status: String(supplier.status).trim(),
            created_at: now()
        };

        suppliers.push(newSupplier);
        writeJsonFile(SUPPLIERS_FILE, suppliers);
        return res.json({ success: true, message: "Supplier created successfully", data: newSupplier });
    }

    // ─── UPDATE ─────────────────────────────────────────────
    if (action === "update") {
        const supplier = input.supplier || {};
        const id = supplier.id || "";
        if (!id) return res.json({ success: false, message: "Supplier ID is required", data: [] });

        let found = false;
        for (let i = 0; i < suppliers.length; i++) {
            if (String(suppliers[i].id) === String(id)) {
                found = true;
                const existing = suppliers[i];
                const required = ["name", "contact_person", "phone", "email", "address", "payment_terms", "status"];
                for (const field of required) {
                    if (!supplier[field] || String(supplier[field]).trim() === "") {
                        const label = field.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());
                        return res.json({ success: false, message: `${label} is required`, data: [] });
                    }
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(supplier.email)) {
                    return res.json({ success: false, message: "Invalid email address", data: [] });
                }

                const phoneRegex = /^[0-9+\-\s]{7,15}$/;
                if (!phoneRegex.test(supplier.phone)) {
                    return res.json({ success: false, message: "Invalid phone number", data: [] });
                }

                const existingCode = existing.code || existing.supplier_code || "";

                suppliers[i] = {
                    id: existing.id,
                    code: existingCode,
                    name: String(supplier.name).trim(),
                    contact_person: String(supplier.contact_person).trim(),
                    phone: String(supplier.phone).trim(),
                    email: String(supplier.email).trim(),
                    address: String(supplier.address).trim(),
                    tax_number: (supplier.tax_number || "").trim(),
                    payment_terms: String(supplier.payment_terms).trim(),
                    group: (supplier.group || supplier.supplier_group || existing.group || "General").trim(),
                    status: String(supplier.status).trim(),
                    created_at: existing.created_at || now(),
                    updated_at: now()
                };
                break;
            }
        }

        if (!found) return res.json({ success: false, message: "Supplier not found", data: [] });

        writeJsonFile(SUPPLIERS_FILE, suppliers);
        return res.json({ success: true, message: "Supplier updated successfully", data: [] });
    }

    // ─── DELETE ─────────────────────────────────────────────
    if (action === "delete") {
        const id = input.id || "";
        if (!id) return res.json({ success: false, message: "Supplier ID is required", data: [] });

        const newSuppliers = suppliers.filter(s => String(s.id) !== String(id));
        if (newSuppliers.length === suppliers.length) {
            return res.json({ success: false, message: "Supplier not found", data: [] });
        }

        writeJsonFile(SUPPLIERS_FILE, newSuppliers);
        return res.json({ success: true, message: "Supplier deleted successfully", data: [] });
    }

    return res.json({ success: false, message: "Invalid action", data: [] });
});

// ═══════════════════════════════════════════════════════════════════════════
// ITEM-SUPPLIER MAPPINGS API
// ═══════════════════════════════════════════════════════════════════════════

const MAPPINGS_FILE = "item_supplier_mappings.json";

function enrichMapping(mapping, items, suppliers) {
    const m = { ...mapping };
    for (const item of items) {
        if (String(item.id || "") === String(m.item_id || "")) {
            m.item_code = item.code || "";
            m.item_name = item.name || "";
            m.item_unit = item.unit || "";
            m.item_category = item.category || "";
            break;
        }
    }
    for (const sup of suppliers) {
        if (String(sup.id || "") === String(m.supplier_id || "")) {
            m.supplier_code = sup.code || sup.supplier_code || "";
            m.supplier_name = sup.name || sup.supplier_name || "";
            m.supplier_phone = sup.phone || "";
            m.supplier_email = sup.email || "";
            break;
        }
    }
    return m;
}

app.get("/api/item_supplier_mappings.php", (req, res) => {
    const mappings = readJsonFile(MAPPINGS_FILE);
    const items = readJsonFile(ITEMS_FILE);
    const suppliers = readJsonFile(SUPPLIERS_FILE);
    const { search, item_id, supplier_id, preferred, status } = req.query;

    let result = mappings.map(m => enrichMapping(m, items, suppliers));

    if (item_id) result = result.filter(m => String(m.item_id || "") === String(item_id));
    if (supplier_id) result = result.filter(m => String(m.supplier_id || "") === String(supplier_id));
    if (preferred !== undefined && preferred !== "") {
        const isPref = preferred === "1" || preferred === "true";
        result = result.filter(m => Boolean(m.preferred) === isPref);
    }
    if (status) result = result.filter(m => (m.status || "").toLowerCase() === status.toLowerCase());
    if (search) {
        const s = search.toLowerCase();
        result = result.filter(m => JSON.stringify(m).toLowerCase().includes(s));
    }

    jsonResponse(res, true, result);
});

app.post("/api/item_supplier_mappings.php", (req, res) => {
    let mappings = readJsonFile(MAPPINGS_FILE);
    const items = readJsonFile(ITEMS_FILE);
    const suppliers = readJsonFile(SUPPLIERS_FILE);
    const data = req.body;

    const missing = validateRequired(data, ["item_id", "supplier_id", "purchase_price", "status"]);
    if (missing) return jsonResponse(res, false, [], `Field '${missing}' is required.`, 422);

    const itemId = parseInt(data.item_id, 10);
    const supplierId = parseInt(data.supplier_id, 10);
    const purchasePrice = parseFloat(data.purchase_price);
    const isPreferred = data.preferred === true || data.preferred === "true" || data.preferred === 1 || data.preferred === "1";

    if (purchasePrice < 0) return jsonResponse(res, false, [], "Purchase price cannot be negative.", 422);

    const itemObj = items.find(it => parseInt(it.id, 10) === itemId);
    if (!itemObj) return jsonResponse(res, false, [], "Selected item does not exist.", 422);

    const supplierObj = suppliers.find(s => parseInt(s.id, 10) === supplierId);
    if (!supplierObj) return jsonResponse(res, false, [], "Selected supplier does not exist.", 422);

    // Check duplicate
    const dupMapping = mappings.find(m => parseInt(m.item_id, 10) === itemId && parseInt(m.supplier_id, 10) === supplierId);
    if (dupMapping) {
        const supName = supplierObj.name || supplierObj.supplier_name || "this supplier";
        const itName = itemObj.name || "this item";
        return jsonResponse(res, false, [], `Mapping already exists between '${itName}' and '${supName}'.`, 422);
    }

    // Preferred reset
    if (isPreferred) {
        for (const m of mappings) {
            if (parseInt(m.item_id, 10) === itemId) m.preferred = false;
        }
    }

    const ids = mappings.map(m => m.id || 0);
    data.id = ids.length ? Math.max(...ids) + 1 : 1;
    data.mapping_code = generateCode(mappings, "mapping_code", "MAP");
    data.item_id = itemId;
    data.item_code = itemObj.code || "";
    data.item_name = itemObj.name || "";
    data.supplier_id = supplierId;
    data.supplier_code = supplierObj.code || supplierObj.supplier_code || "";
    data.supplier_name = supplierObj.name || supplierObj.supplier_name || "";
    data.supplier_item_code = (data.supplier_item_code || "").trim();
    data.purchase_price = purchasePrice;
    data.preferred = isPreferred;
    data.status = (data.status || "Active").trim();
    data.created_at = now();

    mappings.push(data);
    writeJsonFile(MAPPINGS_FILE, mappings);
    jsonResponse(res, true, data, "Item-Supplier mapping created successfully.");
});

app.put("/api/item_supplier_mappings.php", (req, res) => {
    let mappings = readJsonFile(MAPPINGS_FILE);
    const items = readJsonFile(ITEMS_FILE);
    const suppliers = readJsonFile(SUPPLIERS_FILE);
    const data = req.body;

    if (!data.id) return jsonResponse(res, false, [], "Mapping ID is required.", 422);
    const index = findIndex(mappings, data.id);
    if (index < 0) return jsonResponse(res, false, [], "Mapping not found.", 404);

    const missing = validateRequired(data, ["item_id", "supplier_id", "purchase_price", "status"]);
    if (missing) return jsonResponse(res, false, [], `Field '${missing}' is required.`, 422);

    const itemId = parseInt(data.item_id, 10);
    const supplierId = parseInt(data.supplier_id, 10);
    const purchasePrice = parseFloat(data.purchase_price);
    const isPreferred = data.preferred === true || data.preferred === "true" || data.preferred === 1 || data.preferred === "1";
    const currentId = data.id;

    if (purchasePrice < 0) return jsonResponse(res, false, [], "Purchase price cannot be negative.", 422);

    const dupMapping = mappings.find(m => String(m.id) !== String(currentId) && parseInt(m.item_id, 10) === itemId && parseInt(m.supplier_id, 10) === supplierId);
    if (dupMapping) return jsonResponse(res, false, [], "Another mapping already exists for this Item and Supplier combination.", 422);

    if (isPreferred) {
        for (const m of mappings) {
            if (String(m.id) !== String(currentId) && parseInt(m.item_id, 10) === itemId) m.preferred = false;
        }
    }

    const itemObj = items.find(it => parseInt(it.id, 10) === itemId);
    const supplierObj = suppliers.find(s => parseInt(s.id, 10) === supplierId);

    data.mapping_code = mappings[index].mapping_code || generateCode(mappings, "mapping_code", "MAP");
    data.item_id = itemId;
    data.item_code = itemObj ? (itemObj.code || "") : (mappings[index].item_code || "");
    data.item_name = itemObj ? (itemObj.name || "") : (mappings[index].item_name || "");
    data.supplier_id = supplierId;
    data.supplier_code = supplierObj ? (supplierObj.code || "") : (mappings[index].supplier_code || "");
    data.supplier_name = supplierObj ? (supplierObj.name || "") : (mappings[index].supplier_name || "");
    data.supplier_item_code = (data.supplier_item_code || "").trim();
    data.purchase_price = purchasePrice;
    data.preferred = isPreferred;
    data.status = (data.status || "Active").trim();
    data.created_at = mappings[index].created_at || now();
    data.updated_at = now();

    mappings[index] = data;
    writeJsonFile(MAPPINGS_FILE, mappings);
    jsonResponse(res, true, data, "Item-Supplier mapping updated successfully.");
});

app.delete("/api/item_supplier_mappings.php", (req, res) => {
    const mappings = readJsonFile(MAPPINGS_FILE);
    const id = req.query.id || "";
    const index = findIndex(mappings, id);
    if (index < 0) return jsonResponse(res, false, [], "Mapping not found.", 404);
    mappings.splice(index, 1);
    writeJsonFile(MAPPINGS_FILE, mappings);
    jsonResponse(res, true, [], "Item-Supplier mapping deleted successfully.");
});

// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE PRICES API
// ═══════════════════════════════════════════════════════════════════════════

const PRICES_FILE = "purchase_prices.json";

function enrichPrices(prices, items, suppliers, mappings) {
    // Lowest active price per item
    const lowestPrices = {};
    for (const p of prices) {
        if ((p.status || "").toLowerCase() === "active") {
            const itemId = parseInt(p.item_id, 10);
            const price = parseFloat(p.purchase_price);
            if (lowestPrices[itemId] === undefined || price < lowestPrices[itemId]) {
                lowestPrices[itemId] = price;
            }
        }
    }

    // Preferred suppliers from mappings
    const preferredSuppliers = {};
    for (const m of mappings) {
        if (m.preferred === true || m.preferred === "true" || m.preferred === 1) {
            preferredSuppliers[parseInt(m.item_id, 10)] = parseInt(m.supplier_id, 10);
        }
    }

    // Dictionaries
    const itemDict = {};
    for (const it of items) itemDict[parseInt(it.id, 10)] = it;
    const supDict = {};
    for (const s of suppliers) supDict[parseInt(s.id, 10)] = s;

    return prices.map(p => {
        const pp = { ...p };
        const itemId = parseInt(pp.item_id || 0, 10);
        const supplierId = parseInt(pp.supplier_id || 0, 10);

        if (itemDict[itemId]) {
            pp.item_code = itemDict[itemId].code || pp.item_code || "";
            pp.item_name = itemDict[itemId].name || pp.item_name || "";
            pp.item_unit = itemDict[itemId].unit || "";
            pp.item_category = itemDict[itemId].category || "";
        }

        if (supDict[supplierId]) {
            pp.supplier_code = supDict[supplierId].code || supDict[supplierId].supplier_code || pp.supplier_code || "";
            pp.supplier_name = supDict[supplierId].name || supDict[supplierId].supplier_name || pp.supplier_name || "";
        }

        const isActive = (pp.status || "").toLowerCase() === "active";
        const priceVal = parseFloat(pp.purchase_price || 0);

        pp.is_lowest_price = isActive && lowestPrices[itemId] !== undefined && Math.abs(priceVal - lowestPrices[itemId]) < 0.001;
        pp.is_preferred_supplier = preferredSuppliers[itemId] !== undefined && preferredSuppliers[itemId] === supplierId;

        return pp;
    });
}

app.get("/api/purchase_prices.php", (req, res) => {
    const prices = readJsonFile(PRICES_FILE);
    const items = readJsonFile(ITEMS_FILE);
    const suppliers = readJsonFile(SUPPLIERS_FILE);
    const mappings = readJsonFile(MAPPINGS_FILE);
    const { search, item_id, supplier_id, status } = req.query;

    let result = enrichPrices(prices, items, suppliers, mappings);

    if (item_id) result = result.filter(p => String(p.item_id || "") === String(item_id));
    if (supplier_id) result = result.filter(p => String(p.supplier_id || "") === String(supplier_id));
    if (status) result = result.filter(p => (p.status || "").toLowerCase() === status.toLowerCase());
    if (search) {
        const s = search.toLowerCase();
        result = result.filter(p => JSON.stringify(p).toLowerCase().includes(s));
    }

    jsonResponse(res, true, result);
});

app.post("/api/purchase_prices.php", (req, res) => {
    let prices = readJsonFile(PRICES_FILE);
    const items = readJsonFile(ITEMS_FILE);
    const suppliers = readJsonFile(SUPPLIERS_FILE);
    const data = req.body;

    const missing = validateRequired(data, ["item_id", "supplier_id", "purchase_price", "effective_from", "status"]);
    if (missing) return jsonResponse(res, false, [], `Field '${missing}' is required.`, 422);

    const itemId = parseInt(data.item_id, 10);
    const supplierId = parseInt(data.supplier_id, 10);
    const purchasePrice = parseFloat(data.purchase_price);
    const tax = parseFloat(data.tax || 5.0);
    const status = (data.status || "Active").trim();
    const effectiveFrom = String(data.effective_from).trim();
    const effectiveTo = (data.effective_to || "").trim();

    if (purchasePrice < 0 || tax < 0) return jsonResponse(res, false, [], "Purchase price and tax cannot be negative.", 422);

    const itemObj = items.find(it => parseInt(it.id, 10) === itemId);
    if (!itemObj) return jsonResponse(res, false, [], "Selected item not found.", 422);

    const supplierObj = suppliers.find(s => parseInt(s.id, 10) === supplierId);
    if (!supplierObj) return jsonResponse(res, false, [], "Selected supplier not found.", 422);

    // Archive previous active prices for same item+supplier
    if (status.toLowerCase() === "active") {
        for (const existing of prices) {
            if (parseInt(existing.item_id, 10) === itemId && parseInt(existing.supplier_id, 10) === supplierId && (existing.status || "").toLowerCase() === "active") {
                existing.status = "Historical";
                if (!existing.effective_to || existing.effective_to > effectiveFrom) {
                    existing.effective_to = addDays(effectiveFrom, -1);
                }
            }
        }
    }

    const ids = prices.map(p => p.id || 0);
    data.id = ids.length ? Math.max(...ids) + 1 : 1;
    data.price_code = generateCode(prices, "price_code", "PRC");
    data.item_id = itemId;
    data.item_code = itemObj.code || "";
    data.item_name = itemObj.name || "";
    data.supplier_id = supplierId;
    data.supplier_code = supplierObj.code || supplierObj.supplier_code || "";
    data.supplier_name = supplierObj.name || supplierObj.supplier_name || "";
    data.purchase_price = purchasePrice;
    data.tax = tax;
    data.effective_from = effectiveFrom;
    data.effective_to = effectiveTo;
    data.status = status;
    data.created_at = now();

    prices.push(data);
    writeJsonFile(PRICES_FILE, prices);
    jsonResponse(res, true, data, "Purchase price record created successfully.");
});

app.put("/api/purchase_prices.php", (req, res) => {
    const prices = readJsonFile(PRICES_FILE);
    const items = readJsonFile(ITEMS_FILE);
    const suppliers = readJsonFile(SUPPLIERS_FILE);
    const data = req.body;

    if (!data.id) return jsonResponse(res, false, [], "Price ID is required.", 422);
    const index = findIndex(prices, data.id);
    if (index < 0) return jsonResponse(res, false, [], "Price record not found.", 404);

    const missing = validateRequired(data, ["item_id", "supplier_id", "purchase_price", "effective_from", "status"]);
    if (missing) return jsonResponse(res, false, [], `Field '${missing}' is required.`, 422);

    const itemId = parseInt(data.item_id, 10);
    const supplierId = parseInt(data.supplier_id, 10);
    const purchasePrice = parseFloat(data.purchase_price);
    const tax = parseFloat(data.tax || 5.0);
    const status = (data.status || "Active").trim();

    if (purchasePrice < 0 || tax < 0) return jsonResponse(res, false, [], "Purchase price and tax cannot be negative.", 422);

    const itemObj = items.find(it => parseInt(it.id, 10) === itemId);
    const supplierObj = suppliers.find(s => parseInt(s.id, 10) === supplierId);

    data.price_code = prices[index].price_code || generateCode(prices, "price_code", "PRC");
    data.item_id = itemId;
    data.item_code = itemObj ? (itemObj.code || "") : (prices[index].item_code || "");
    data.item_name = itemObj ? (itemObj.name || "") : (prices[index].item_name || "");
    data.supplier_id = supplierId;
    data.supplier_code = supplierObj ? (supplierObj.code || "") : (prices[index].supplier_code || "");
    data.supplier_name = supplierObj ? (supplierObj.name || "") : (prices[index].supplier_name || "");
    data.purchase_price = purchasePrice;
    data.tax = tax;
    data.effective_from = String(data.effective_from).trim();
    data.effective_to = (data.effective_to || "").trim();
    data.status = status;
    data.created_at = prices[index].created_at || now();
    data.updated_at = now();

    prices[index] = data;
    writeJsonFile(PRICES_FILE, prices);
    jsonResponse(res, true, data, "Purchase price record updated successfully.");
});

app.delete("/api/purchase_prices.php", (req, res) => {
    const prices = readJsonFile(PRICES_FILE);
    const id = req.query.id || "";
    const index = findIndex(prices, id);
    if (index < 0) return jsonResponse(res, false, [], "Price record not found.", 404);
    prices.splice(index, 1);
    writeJsonFile(PRICES_FILE, prices);
    jsonResponse(res, true, [], "Purchase price record deleted successfully.");
});

// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS API
// ═══════════════════════════════════════════════════════════════════════════

const ORDERS_FILE = "purchase_orders.json";

app.get("/api/purchase_orders.php", (req, res) => {
    let orders = readJsonFile(ORDERS_FILE);
    const { id, search } = req.query;

    if (id !== undefined && id !== "") {
        const idx = findIndex(orders, id);
        if (idx < 0) return jsonResponse(res, false, [], "Purchase order not found.", 404);
        return jsonResponse(res, true, orders[idx]);
    }

    if (search) {
        const s = search.toLowerCase();
        orders = orders.filter(order => JSON.stringify(order).toLowerCase().includes(s));
    }

    jsonResponse(res, true, orders);
});

app.post("/api/purchase_orders.php", (req, res) => {
    const orders = readJsonFile(ORDERS_FILE);
    const data = req.body;

    const missing = validateRequired(data, ["po_date", "supplier_id", "expected_delivery_date", "payment_terms", "delivery_location", "status"]);
    if (missing) return jsonResponse(res, false, [], `Field '${missing}' is required.`, 422);

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        return jsonResponse(res, false, [], "At least one item is required.", 422);
    }

    for (const item of data.items) {
        if (!item.item_id || parseFloat(item.quantity || 0) <= 0) {
            return jsonResponse(res, false, [], "Each item must have valid quantity.", 422);
        }
    }

    const ids = orders.map(o => o.id || 0);
    data.id = ids.length ? Math.max(...ids) + 1 : 1;
    data.po_number = generateCode(orders, "po_number", "PO");
    data.created_by = "Admin";
    data.created_at = now();

    orders.push(data);
    writeJsonFile(ORDERS_FILE, orders);
    jsonResponse(res, true, data, "Purchase order created successfully.");
});

app.put("/api/purchase_orders.php", (req, res) => {
    const orders = readJsonFile(ORDERS_FILE);
    const data = req.body;

    if (!data.id) return jsonResponse(res, false, [], "Purchase order ID required.", 422);
    const index = findIndex(orders, data.id);
    if (index < 0) return jsonResponse(res, false, [], "Purchase order not found.", 404);

    const missing = validateRequired(data, ["po_date", "supplier_id", "expected_delivery_date", "payment_terms", "delivery_location", "status"]);
    if (missing) return jsonResponse(res, false, [], `Field '${missing}' is required.`, 422);

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        return jsonResponse(res, false, [], "At least one item is required.", 422);
    }

    data.po_number = orders[index].po_number;
    data.created_by = orders[index].created_by;
    data.created_at = orders[index].created_at;

    orders[index] = data;
    writeJsonFile(ORDERS_FILE, orders);
    jsonResponse(res, true, data, "Purchase order updated successfully.");
});

app.delete("/api/purchase_orders.php", (req, res) => {
    const orders = readJsonFile(ORDERS_FILE);
    const id = req.query.id || "";
    const index = findIndex(orders, id);
    if (index < 0) return jsonResponse(res, false, [], "Purchase order not found.", 404);
    orders.splice(index, 1);
    writeJsonFile(ORDERS_FILE, orders);
    jsonResponse(res, true, [], "Purchase order deleted successfully.");
});

// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE ORDER PDF DOWNLOAD API
// ═══════════════════════════════════════════════════════════════════════════

const PDFDocument = require("pdfkit");

// Company profile is intentionally separate from PO documents. It stores only
// the current branding settings; generated PDFs and signatures are never saved.
const COMPANY_SETTINGS_FILE = "company_settings.json";
const DEFAULT_COMPANY_SETTINGS = {
    name: "BlueSun",
    legalName: "Bluesun International LLC",
    address: "Ghala, 250 Way no. 5001, 112, Muscat, Oman",
    phone: "+968 22584259",
    email: "sales@bluesun-om.com",
    taxId: "", // Fill in if applicable; never fabricate a tax ID.
    bankDetails: "", // Fill in if applicable.
    website: "",
    terms: "Please supply the goods/services as specified above. All deliveries are subject to the agreed payment terms.",
    footerNote: "ISO 9001:2005 Certified Company",
    logoData: ""
};

function companySettings() {
    const records = readJsonFile(COMPANY_SETTINGS_FILE);
    return { ...DEFAULT_COMPANY_SETTINGS, ...(records[0] || {}) };
}

function safePdfText(value, maxLength = 1200) {
    return String(value == null ? "" : value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function allowedDataImage(value, maxBytes = 2 * 1024 * 1024) {
    if (typeof value !== "string" || !/^data:image\/(png|jpe?g);base64,/i.test(value)) return null;
    const encoded = value.slice(value.indexOf(",") + 1);
    if (!/^[a-z0-9+/=]+$/i.test(encoded)) return null;
    const data = Buffer.from(encoded, "base64");
    return data.length && data.length <= maxBytes ? data : null;
}

// Kept as an allow-list so the submitted editable HTML is treated as untrusted.
function sanitizePoHtml(html) {
    return String(html || "").replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
        .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
        .replace(/javascript\s*:/gi, "").slice(0, 250000);
}

app.get("/api/company_settings.php", (req, res) => jsonResponse(res, true, companySettings()));

app.put("/api/company_settings.php", (req, res) => {
    const current = companySettings();
    const input = req.body || {};
    const next = { ...current };
    ["name", "legalName", "address", "phone", "email", "taxId", "bankDetails", "website", "terms", "footerNote"].forEach(key => {
        if (input[key] !== undefined) next[key] = safePdfText(input[key], key === "terms" ? 2000 : 300);
    });
    if (input.logoData !== undefined) {
        const image = allowedDataImage(input.logoData);
        if (!image) return jsonResponse(res, false, [], "Logo must be a PNG or JPEG image under 2MB.", 422);
        next.logoData = input.logoData;
    }
    // One record means a replacement logo/settings record cannot leave orphans.
    writeJsonFile(COMPANY_SETTINGS_FILE, [next]);
    jsonResponse(res, true, next, "Company profile updated.");
});

app.post("/api/purchase_order_pdf_render.php", (req, res) => {
    try {
        const payload = req.body || {};
        const model = payload.document || {};
        const sourceHtml = sanitizePoHtml(payload.documentHtml); // sanitized before any potential downstream reuse
        if (!sourceHtml || !safePdfText(model.poNumber, 80)) return jsonResponse(res, false, [], "A purchase-order document is required.", 422);
        if (!Array.isArray(model.items) || !model.items.length || model.items.length > 100) return jsonResponse(res, false, [], "The document must contain 1–100 line items.", 422);

        const company = companySettings();
        const logo = allowedDataImage(company.logoData) || (fs.existsSync(path.join(__dirname, "picture", "logo.png")) ? fs.readFileSync(path.join(__dirname, "picture", "logo.png")) : null);
        const signature = allowedDataImage(payload.signatureData);
        const doc = new PDFDocument({ size: "A4", margins: { top: 42, right: 42, bottom: 48, left: 42 } });
        const buffers = [];
        doc.on("data", chunk => buffers.push(chunk));
        doc.on("end", () => {
            const fileName = `PO_${safePdfText(model.poNumber, 50).replace(/[^a-z0-9_-]/gi, "_")}_${today()}.pdf`;
            res.set({ "Content-Type": "application/pdf", "Content-Disposition": `${req.query.mode === "print" ? "inline" : "attachment"}; filename="${fileName}"`, "Cache-Control": "no-store" });
            res.send(Buffer.concat(buffers));
        });
        const W = doc.page.width - doc.page.margins.left - doc.page.margins.right, L = doc.page.margins.left;
        const line = (label, value, x, y, width) => { doc.font("Helvetica-Bold").fontSize(8).fillColor("#334155").text(label + ": ", x, y, { continued: true, width }); doc.font("Helvetica").fillColor("#172033").text(safePdfText(value), { width }); };
        if (logo) { try { doc.image(logo, L, 42, { fit: [58, 58] }); } catch (_) {} }
        doc.font("Helvetica-Bold").fontSize(19).fillColor("#1d4ed8").text(company.name, L + 70, 44);
        doc.fontSize(9).fillColor("#172033").text(company.legalName, L + 70, 68).font("Helvetica").fontSize(7.5).text(`Address: ${company.address}\nPhone: ${company.phone}  Email: ${company.email}\nTax ID: ${company.taxId || "[To be provided]"}`, L + 70, 81);
        doc.font("Helvetica-Bold").fontSize(16).fillColor("#1d4ed8").text("PURCHASE ORDER", L + W - 175, 46, { width: 175, align: "right" });
        doc.font("Helvetica").fontSize(8).fillColor("#172033").text(safePdfText(model.header), L + W - 175, 70, { width: 175, align: "right" });
        doc.moveTo(L, 112).lineTo(L + W, 112).lineWidth(2).strokeColor("#1d4ed8").stroke();
        const boxY = 125, half = (W - 12) / 2; doc.rect(L, boxY, half, 80).strokeColor("#cbd5e1").stroke();doc.rect(L+half+12, boxY, half, 80).stroke();
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#1d4ed8").text("SUPPLIER", L + 8, boxY + 8);doc.font("Helvetica").fontSize(8).fillColor("#172033").text(safePdfText(model.supplier, 700), L + 8, boxY + 22, { width: half - 16 });
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#1d4ed8").text("DELIVER TO", L+half+20, boxY+8);doc.font("Helvetica").fontSize(8).fillColor("#172033").text(safePdfText(model.delivery, 700), L+half+20, boxY+22,{width:half-16});
        let y=220, widths=[24, W-24-72-82-48-85,72,82,48,85], xs=[];let cursor=L;widths.forEach(w=>{xs.push(cursor);cursor+=w});
        doc.rect(L,y,W,21).fill("#1d4ed8");["#","Description","Quantity","Unit Price","Tax","Line Total"].forEach((h,i)=>doc.font("Helvetica-Bold").fontSize(7.5).fillColor("white").text(h,xs[i]+4,y+7,{width:widths[i]-8,align:i>1?"right":"left"}));y+=21;
        model.items.forEach((row,index)=>{if(y>680){doc.addPage();y=50;} const values=Array.isArray(row)?row:[];const h=28;doc.rect(L,y,W,h).strokeColor("#dbe3ee").stroke();[values[0]||index+1,values[1],values[2],values[3],values[4],values[5]].forEach((v,i)=>doc.font("Helvetica").fontSize(7.5).fillColor("#172033").text(safePdfText(v,220),xs[i]+4,y+8,{width:widths[i]-8,align:i>1?"right":"left",height:h-8}));y+=h;});
        y+=14; const totals=(model.totals||[]).slice(0,4); totals.forEach((pair,i)=>{doc.font(i===totals.length-1?"Helvetica-Bold":"Helvetica").fontSize(i===totals.length-1?10:8.5).fillColor(i===totals.length-1?"#1d4ed8":"#172033").text(safePdfText(pair[0]),L+W-210,y,{width:110}).text("₹ "+Number(pair[1]||0).toLocaleString("en-IN",{minimumFractionDigits:2}),L+W-95,y,{width:95,align:"right"});y+=18;});
        y+=15;doc.font("Helvetica-Bold").fontSize(9).fillColor("#1d4ed8").text("Terms & Conditions",L,y);doc.font("Helvetica").fontSize(8).fillColor("#334155").text(safePdfText(model.terms,1600),L,y+14,{width:W-220});
        const sy=Math.min(doc.page.height-85,Math.max(y+48,650));if(signature){try{doc.image(signature,L+W-190,sy-42,{fit:[160,40]});}catch(_){}}doc.moveTo(L+W-190,sy).lineTo(L+W,sy).strokeColor("#334155").stroke();doc.fontSize(7).fillColor("#475569").text("Authorized Signature",L+W-190,sy+4,{width:190,align:"center"});doc.fontSize(7).text(company.footerNote,L,doc.page.height-32,{width:W,align:"center"});
        doc.end();
    } catch (err) { console.error("PO preview PDF error:", err); if (!res.headersSent) jsonResponse(res, false, [], "Failed to render PDF.", 500); }
});

/**
 * POST /api/purchase_order_pdf.php
 *
 * Generates a Purchase Order PDF in-memory and streams it as a forced
 * browser download. Nothing is saved to disk or database.
 *
 * Expected JSON body fields:
 *   po_number, quote_id, supplier_name, supplier_address, supplier_gst,
 *   order_date, delivery_date, delivery_terms, return_policy,
 *   items (array of { item_name, hsn_code, quantity, unit_price }),
 *   subtotal, tax_amount, grand_total, terms_conditions
 *
 * Also accepts the PO id to auto-fetch from stored data.
 */
app.post("/api/purchase_order_pdf.php", (req, res) => {
    try {
        const data = req.body;

        // ─── Validate minimum required fields ──────────────────────────
        if (!data.po_number) {
            return res.status(422).json({ success: false, message: "PO number is required." });
        }
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
            return res.status(422).json({ success: false, message: "At least one item is required." });
        }

        // ─── Company details (hardcoded per requirement) ───────────────
        const company = {
            name: "BlueSun International",
            address: "123 Business Avenue, Mumbai",
            gst: "22AAAAA0000A1Z5",
            phone: "+91-98765-43210",
            email: "info@bluesun.com",
            website: "www.bluesun.com"
        };

        // ─── Extract PO data with safe defaults ────────────────────────
        const po = {
            po_number:      String(data.po_number || "").trim(),
            quote_id:        String(data.quote_id || data.reference_number || "N/A").trim(),
            order_date:      String(data.order_date || data.po_date || today()).trim(),
            delivery_date:   String(data.delivery_date || data.expected_delivery_date || "N/A").trim(),
            supplier_name:   String(data.supplier_name || "N/A").trim(),
            supplier_address:String(data.supplier_address || "N/A").trim(),
            supplier_gst:    String(data.supplier_gst || "N/A").trim(),
            delivery_terms:  String(data.delivery_terms || data.payment_terms || "N/A").trim(),
            return_policy:   String(data.return_policy || "As per company policy").trim(),
            items:           data.items,
            subtotal:        parseFloat(data.subtotal || 0),
            tax_amount:      parseFloat(data.tax_amount || data.total_tax || 0),
            grand_total:     parseFloat(data.grand_total || 0),
            terms_conditions:String(data.terms_conditions || data.notes || "Standard purchase terms apply.").trim()
        };

        // ─── Color palette ─────────────────────────────────────────────
        const COLORS = {
            primary:    "#1a237e",   // Deep indigo
            secondary:  "#283593",   // Medium indigo
            accent:     "#3949ab",   // Lighter indigo
            headerBg:   "#e8eaf6",   // Light indigo background
            tableBg:    "#f5f5f5",   // Light grey for alternate rows
            tableHead:  "#1a237e",   // Table header background
            text:       "#212121",   // Near-black body text
            textLight:  "#616161",   // Grey secondary text
            border:     "#bdbdbd",   // Border grey
            white:      "#ffffff",
            highlight:  "#e3f2fd",   // Highlight blue
            footerBg:   "#1a237e"    // Footer background
        };

        // ─── Create PDF document (A4, no auto-page) ────────────────────
        const doc = new PDFDocument({
            size: "A4",
            margins: { top: 50, bottom: 80, left: 50, right: 50 },
            bufferPages: true,           // Allows footer injection on all pages
            info: {
                Title: `Purchase Order - ${po.po_number}`,
                Author: company.name,
                Subject: "Purchase Order",
                Creator: "Bluefinch ERP"
            }
        });

        // ─── Collect PDF into in-memory buffers (NO disk I/O) ──────────
        const buffers = [];
        doc.on("data", chunk => buffers.push(chunk));
        doc.on("end", () => {
            const pdfData = Buffer.concat(buffers);

            // Force-download response headers
            res.writeHead(200, {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="PO-${po.po_number}.pdf"`,
                "Content-Length": pdfData.length,
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            });
            res.end(pdfData);
        });

        // ─── Page dimensions ───────────────────────────────────────────
        const pageWidth  = doc.page.width;
        const marginLeft = doc.page.margins.left;
        const marginRight= doc.page.margins.right;
        const usableWidth= pageWidth - marginLeft - marginRight;

        // ─── HELPER: Draw footer on a given page ───────────────────────
        function drawFooter(page) {
            const footerY = doc.page.height - 60;
            doc.switchToPage(page);

            // Footer background bar
            doc.save();
            doc.rect(0, footerY, pageWidth, 40).fill(COLORS.footerBg);

            // Footer text
            doc.fontSize(7)
               .fillColor(COLORS.white)
               .text(
                   `${company.name}  |  ${company.address}  |  ${company.website}  |  Thank you for your business!`,
                   0, footerY + 14,
                   { align: "center", width: pageWidth }
               );
            doc.restore();
        }

        // ─── HELPER: Check remaining space, add new page if needed ─────
        function ensureSpace(needed) {
            const bottomLimit = doc.page.height - doc.page.margins.bottom - 20;
            if (doc.y + needed > bottomLimit) {
                doc.addPage();
            }
        }

        // ─── HELPER: Format currency ───────────────────────────────────
        function formatCurrency(val) {
            return "₹ " + parseFloat(val || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        // ════════════════════════════════════════════════════════════════
        // SECTION 1: LETTERHEAD / HEADER
        // ════════════════════════════════════════════════════════════════

        const logoSize = 60;
        const logoX = marginLeft;
        const logoY = doc.y;

        // Draw a placeholder logo box
        doc.save();
        doc.roundedRect(logoX, logoY, logoSize, logoSize, 6)
           .lineWidth(1.5)
           .strokeColor(COLORS.primary)
           .fillAndStroke(COLORS.headerBg, COLORS.primary);
        doc.fontSize(9)
           .fillColor(COLORS.primary)
           .text("LOGO", logoX, logoY + 23, { width: logoSize, align: "center" });
        doc.restore();

        // Company name (large, bold, next to logo)
        const companyTextX = logoX + logoSize + 14;
        doc.fontSize(20)
           .fillColor(COLORS.primary)
           .font("Helvetica-Bold")
           .text(company.name, companyTextX, logoY + 2);

        // Company details (smaller, below name)
        doc.fontSize(8)
           .fillColor(COLORS.textLight)
           .font("Helvetica")
           .text(`Address: ${company.address}`, companyTextX, logoY + 26)
           .text(`GST: ${company.gst}  |  Phone: ${company.phone}`, companyTextX, logoY + 38)
           .text(`Email: ${company.email}`, companyTextX, logoY + 50);

        // Horizontal separator line below header
        const separatorY = logoY + logoSize + 12;
        doc.moveTo(marginLeft, separatorY)
           .lineTo(pageWidth - marginRight, separatorY)
           .lineWidth(2)
           .strokeColor(COLORS.primary)
           .stroke();

        doc.y = separatorY + 8;

        // ════════════════════════════════════════════════════════════════
        // SECTION 2: TITLE — "PURCHASE ORDER"
        // ════════════════════════════════════════════════════════════════

        doc.moveDown(0.3);
        doc.fontSize(18)
           .fillColor(COLORS.primary)
           .font("Helvetica-Bold")
           .text("PURCHASE ORDER", marginLeft, doc.y, {
               align: "center",
               width: usableWidth
           });

        // Thin accent line under title
        doc.moveDown(0.3);
        const titleLineY = doc.y;
        const titleLineWidth = 120;
        const titleLineCenterX = marginLeft + (usableWidth - titleLineWidth) / 2;
        doc.moveTo(titleLineCenterX, titleLineY)
           .lineTo(titleLineCenterX + titleLineWidth, titleLineY)
           .lineWidth(1.5)
           .strokeColor(COLORS.accent)
           .stroke();

        doc.y = titleLineY + 12;

        // ════════════════════════════════════════════════════════════════
        // SECTION 3: ORDER DETAILS BLOCK (Two-column)
        // ════════════════════════════════════════════════════════════════

        const detailsStartY = doc.y;
        const colWidth = usableWidth / 2 - 10;

        // Background box for details
        doc.save();
        doc.roundedRect(marginLeft, detailsStartY, usableWidth, 90, 4)
           .fill(COLORS.highlight);
        doc.restore();

        const detailFontSize = 9;
        const detailLineHeight = 16;

        // ─── Left column: PO details ───────────────────────────────────
        let leftY = detailsStartY + 10;
        const leftX = marginLeft + 12;

        function drawDetailRow(x, y, label, value) {
            doc.font("Helvetica-Bold").fontSize(detailFontSize).fillColor(COLORS.text)
               .text(label, x, y, { continued: true });
            doc.font("Helvetica").fillColor(COLORS.textLight)
               .text("  " + value);
        }

        doc.font("Helvetica-Bold").fontSize(detailFontSize).fillColor(COLORS.text).text("PO Number:", leftX, leftY, { continued: true });
        doc.font("Helvetica").fillColor(COLORS.textLight).text("  " + po.po_number);
        leftY += detailLineHeight;

        doc.font("Helvetica-Bold").fontSize(detailFontSize).fillColor(COLORS.text).text("Quote Ref:", leftX, leftY, { continued: true });
        doc.font("Helvetica").fillColor(COLORS.textLight).text("  " + po.quote_id);
        leftY += detailLineHeight;

        doc.font("Helvetica-Bold").fontSize(detailFontSize).fillColor(COLORS.text).text("Order Date:", leftX, leftY, { continued: true });
        doc.font("Helvetica").fillColor(COLORS.textLight).text("  " + po.order_date);
        leftY += detailLineHeight;

        doc.font("Helvetica-Bold").fontSize(detailFontSize).fillColor(COLORS.text).text("Delivery Date:", leftX, leftY, { continued: true });
        doc.font("Helvetica").fillColor(COLORS.textLight).text("  " + po.delivery_date);

        // ─── Right column: Supplier details ────────────────────────────
        let rightY = detailsStartY + 10;
        const rightX = marginLeft + colWidth + 20;

        doc.font("Helvetica-Bold").fontSize(detailFontSize).fillColor(COLORS.text).text("Supplier:", rightX, rightY, { continued: true });
        doc.font("Helvetica").fillColor(COLORS.textLight).text("  " + po.supplier_name);
        rightY += detailLineHeight;

        doc.font("Helvetica-Bold").fontSize(detailFontSize).fillColor(COLORS.text).text("Address:", rightX, rightY, { continued: true });
        doc.font("Helvetica").fillColor(COLORS.textLight).text("  " + po.supplier_address);
        rightY += detailLineHeight;

        doc.font("Helvetica-Bold").fontSize(detailFontSize).fillColor(COLORS.text).text("Supplier GST:", rightX, rightY, { continued: true });
        doc.font("Helvetica").fillColor(COLORS.textLight).text("  " + po.supplier_gst);
        rightY += detailLineHeight;

        doc.font("Helvetica-Bold").fontSize(detailFontSize).fillColor(COLORS.text).text("Delivery Terms:", rightX, rightY, { continued: true });
        doc.font("Helvetica").fillColor(COLORS.textLight).text("  " + po.delivery_terms);
        rightY += detailLineHeight;

        doc.font("Helvetica-Bold").fontSize(detailFontSize).fillColor(COLORS.text).text("Return Policy:", rightX, rightY, { continued: true });
        doc.font("Helvetica").fillColor(COLORS.textLight).text("  " + po.return_policy);

        doc.y = detailsStartY + 100;

        // ════════════════════════════════════════════════════════════════
        // SECTION 4: ITEMS TABLE
        // ════════════════════════════════════════════════════════════════

        doc.moveDown(0.5);
        ensureSpace(60);

        // Column definitions: [label, x-offset, width, alignment]
        const tableX = marginLeft;
        const colDefs = [
            { label: "#",          width: 28,  align: "center" },
            { label: "Item Name",  width: 160, align: "left"   },
            { label: "HSN/SAC",    width: 70,  align: "center" },
            { label: "Qty",        width: 50,  align: "center" },
            { label: "Unit Price", width: 85,  align: "right"  },
            { label: "Line Total", width: 85,  align: "right"  }
        ];

        // Calculate column x-positions dynamically
        let runningX = tableX;
        for (const col of colDefs) {
            col.x = runningX;
            runningX += col.width;
        }

        const rowHeight = 24;
        const headerRowHeight = 28;
        let tableY = doc.y;

        // ─── Table header row ──────────────────────────────────────────
        doc.save();
        doc.roundedRect(tableX, tableY, usableWidth, headerRowHeight, 3)
           .fill(COLORS.tableHead);

        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.white);
        for (const col of colDefs) {
            doc.text(col.label, col.x + 6, tableY + 9, {
                width: col.width - 12,
                align: col.align
            });
        }
        doc.restore();

        tableY += headerRowHeight;

        // ─── Table data rows ───────────────────────────────────────────
        po.items.forEach((item, idx) => {
            ensureSpace(rowHeight + 4);

            const isAlt = idx % 2 === 1;
            const currentRowY = doc.y > tableY ? doc.y : tableY;

            // Alternate row background
            if (isAlt) {
                doc.save();
                doc.rect(tableX, currentRowY, usableWidth, rowHeight)
                   .fill(COLORS.tableBg);
                doc.restore();
            }

            // Row border line (bottom)
            doc.save();
            doc.moveTo(tableX, currentRowY + rowHeight)
               .lineTo(tableX + usableWidth, currentRowY + rowHeight)
               .lineWidth(0.5)
               .strokeColor(COLORS.border)
               .stroke();
            doc.restore();

            const itemName  = item.item_name || item.description || item.item_code || `Item ${idx + 1}`;
            const hsnCode   = item.hsn_code || item.hsn || "";
            const qty       = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            const lineTotal = item.line_total !== undefined
                ? parseFloat(item.line_total)
                : qty * unitPrice;

            const textY = currentRowY + 7;

            doc.font("Helvetica").fontSize(8).fillColor(COLORS.text);

            // # column
            doc.text(String(idx + 1), colDefs[0].x + 6, textY, {
                width: colDefs[0].width - 12, align: "center"
            });

            // Item Name
            doc.text(itemName, colDefs[1].x + 6, textY, {
                width: colDefs[1].width - 12, align: "left"
            });

            // HSN/SAC
            doc.text(hsnCode, colDefs[2].x + 6, textY, {
                width: colDefs[2].width - 12, align: "center"
            });

            // Quantity
            doc.text(String(qty), colDefs[3].x + 6, textY, {
                width: colDefs[3].width - 12, align: "center"
            });

            // Unit Price
            doc.text(formatCurrency(unitPrice), colDefs[4].x + 6, textY, {
                width: colDefs[4].width - 12, align: "right"
            });

            // Line Total
            doc.font("Helvetica-Bold");
            doc.text(formatCurrency(lineTotal), colDefs[5].x + 6, textY, {
                width: colDefs[5].width - 12, align: "right"
            });

            tableY = currentRowY + rowHeight;
            doc.y = tableY;
        });

        // ════════════════════════════════════════════════════════════════
        // SECTION 5: FINANCIAL SUMMARY
        // ════════════════════════════════════════════════════════════════

        doc.moveDown(0.6);
        ensureSpace(80);

        const summaryX     = marginLeft + usableWidth - 220;
        const summaryWidth = 220;
        let summaryY       = doc.y;

        // Summary background box
        doc.save();
        doc.roundedRect(summaryX, summaryY, summaryWidth, 70, 4)
           .fill(COLORS.highlight);
        doc.restore();

        const sumLabelX = summaryX + 12;
        const sumValueX = summaryX + summaryWidth - 12;
        const sumRowH   = 18;

        // Subtotal
        doc.font("Helvetica").fontSize(9).fillColor(COLORS.text);
        doc.text("Subtotal:", sumLabelX, summaryY + 10);
        doc.text(formatCurrency(po.subtotal), sumLabelX, summaryY + 10, {
            width: summaryWidth - 24, align: "right"
        });

        // Total Tax
        doc.text("Total Tax:", sumLabelX, summaryY + 10 + sumRowH);
        doc.text(formatCurrency(po.tax_amount), sumLabelX, summaryY + 10 + sumRowH, {
            width: summaryWidth - 24, align: "right"
        });

        // Separator line before grand total
        doc.moveTo(sumLabelX, summaryY + 10 + sumRowH * 2)
           .lineTo(sumValueX, summaryY + 10 + sumRowH * 2)
           .lineWidth(0.8)
           .strokeColor(COLORS.border)
           .stroke();

        // Grand Total (bold, larger)
        doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.primary);
        doc.text("Grand Total:", sumLabelX, summaryY + 14 + sumRowH * 2);
        doc.text(formatCurrency(po.grand_total), sumLabelX, summaryY + 14 + sumRowH * 2, {
            width: summaryWidth - 24, align: "right"
        });

        doc.y = summaryY + 80;

        // ════════════════════════════════════════════════════════════════
        // SECTION 6: TERMS & CONDITIONS
        // ════════════════════════════════════════════════════════════════

        doc.moveDown(0.8);
        ensureSpace(60);

        // Section heading
        doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.primary)
           .text("Terms & Conditions:", marginLeft, doc.y);

        doc.moveDown(0.3);

        // T&C content
        doc.font("Helvetica").fontSize(8).fillColor(COLORS.textLight)
           .text(po.terms_conditions, marginLeft, doc.y, {
               width: usableWidth,
               lineGap: 3
           });

        // ════════════════════════════════════════════════════════════════
        // SECTION 7: FOOTER (repeat on ALL pages)
        // ════════════════════════════════════════════════════════════════

        const totalPages = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPages; i++) {
            drawFooter(i);
        }

        // ─── Finalize and stream the PDF ───────────────────────────────
        doc.end();

    } catch (err) {
        console.error("PDF generation error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Failed to generate PDF: " + err.message });
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════════════╗`);
    console.log(`  ║   Bluefinch Dashboard Server Running         ║`);
    console.log(`  ║   http://localhost:${PORT}                      ║`);
    console.log(`  ╚══════════════════════════════════════════════╝\n`);
});
