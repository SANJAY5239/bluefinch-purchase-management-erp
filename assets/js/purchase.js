const app = document.getElementById("app");

let suppliers = [];
let items = [];
let editingId = null;


// ===============================
// COMMON LAYOUT
// ===============================

function layout(content, active = "po") {

    app.innerHTML = `

    <div class="layout">

        <aside class="sidebar">

            <div class="brand side-brand">
                BLUEFINCH <span>ERP</span>
            </div>

            <nav>

                <a href="../dashboard.html">
                    ▣ Dashboard
                </a>

                <a
                    class="${active === "po" ? "active" : ""}"
                    href="purchase-orders.html">

                    ▤ Purchase Orders

                </a>


                <button
                    class="nav-group"
                    onclick="
                    document
                    .getElementById('masters')
                    .classList.toggle('hidden')
                    ">

                    ▾ Masters

                </button>


                <div
                    id="masters"
                    class="subnav">

                    <a href="suppliers.html">
                        Suppliers
                    </a>

                    <a href="items.html">
                        Items
                    </a>

                </div>

            </nav>


            <button
                class="logout"
                onclick="logout()">

                ↪ Logout

            </button>

        </aside>


        <main class="main">

            <header class="topbar">

                <span>
                    ERP /
                    ${active === "po"
                        ? "Purchase Orders"
                        : "Create Purchase Order"}
                </span>

                <span id="userName"></span>

            </header>


            ${content}

        </main>

    </div>

    `;
}


async function logout() {

    await fetch(
        "../api/login.php?action=logout",
        {
            method: "POST"
        }
    );

    location.href =
        "../login.html";
}


// ===============================
// API
// ===============================

async function api(url, options = {}) {

    const response =
        await fetch(
            url,
            options
        );

    return await response.json();
}


// ===============================
// PURCHASE ORDER LIST
// ===============================

async function loadPurchaseOrders() {

    const result =
        await api(
            "../api/purchase-orders.php"
        );


    if (!result.success) {

        alert(result.message);

        return;
    }


    const orders =
        result.data || [];


    const rows =
        orders.map(
            order => `

        <tr>

            <td>
                ${order.po_number}
            </td>

            <td>
                ${order.po_date}
            </td>

            <td>
                ${order.supplier}
            </td>

            <td>
                ₹${Number(
                    order.grand_total || 0
                ).toFixed(2)}
            </td>

            <td>

                <span class="
                    status
                    ${order.status.toLowerCase()}
                ">

                    ${order.status}

                </span>

            </td>

            <td>
                ${order.created_by}
            </td>

            <td>

                <button
                    class="link-btn"
                    onclick="
                    viewPO(
                        '${order.id}'
                    )">

                    View

                </button>


                <button
                    class="link-btn"
                    onclick="
                    editPO(
                        '${order.id}'
                    )">

                    Edit

                </button>


                <button
                    class="
                        link-btn
                        danger-text
                    "
                    onclick="
                    deletePO(
                        '${order.id}'
                    )">

                    Delete

                </button>

            </td>

        </tr>

        `
        ).join("");


    document.getElementById(
        "poRows"
    ).innerHTML =
        rows ||
        `
        <tr>
            <td
                colspan="7"
                class="empty">

                No purchase orders found.

            </td>
        </tr>
        `;
}


function purchaseOrderListPage() {

    layout(`

    <section class="page-head">

        <div>

            <h1>
                Purchase Orders
            </h1>

            <p>
                Create and manage purchase orders.
            </p>

        </div>


        <a
            href="create-purchase.html"
            class="btn btn-primary">

            + Create Purchase Order

        </a>

    </section>


    <div class="panel">

        <div class="table-tools">

            <input
                id="searchPO"
                placeholder="Search PO or supplier...">

        </div>


        <div class="table-wrap">

            <table>

                <thead>

                    <tr>

                        <th>PO Number</th>

                        <th>PO Date</th>

                        <th>Supplier</th>

                        <th>Total Amount</th>

                        <th>Status</th>

                        <th>Created By</th>

                        <th>Actions</th>

                    </tr>

                </thead>


                <tbody id="poRows"></tbody>

            </table>

        </div>

    </div>

    `);


    loadPurchaseOrders();


    document
        .getElementById("searchPO")
        .addEventListener(
            "input",
            function () {

                const search =
                    this.value.toLowerCase();

                document
                    .querySelectorAll(
                        "#poRows tr"
                    )
                    .forEach(row => {

                        row.style.display =
                            row.innerText
                                .toLowerCase()
                                .includes(search)
                                ? ""
                                : "none";

                    });

            }
        );
}


// ===============================
// DELETE
// ===============================

async function deletePO(id) {

    if (
        !confirm(
            "Delete this purchase order?"
        )
    ) {
        return;
    }


    const result =
        await api(
            "../api/purchase-orders.php?action=delete",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        id: id
                    })
            }
        );


    alert(result.message);


    if (result.success) {

        loadPurchaseOrders();

    }
}


// ===============================
// VIEW
// ===============================

async function viewPO(id) {

    const result =
        await api(
            "../api/purchase-orders.php?action=get&id="
            + encodeURIComponent(id)
        );


    if (!result.success) {

        alert(result.message);

        return;
    }


    const po =
        result.data;


    alert(

        "PO Number: " +
        po.po_number +

        "\nSupplier: " +
        po.supplier +

        "\nStatus: " +
        po.status +

        "\nGrand Total: ₹" +
        Number(
            po.grand_total || 0
        ).toFixed(2)

    );
}


// ===============================
// EDIT
// ===============================

function editPO(id) {

    location.href =
        "create-purchase.html?id="
        + encodeURIComponent(id);
}


// ===============================
// LOAD MASTERS
// ===============================

async function loadMasters() {

    const [
        supplierResult,
        itemResult
    ] = await Promise.all([

        api("../api/suppliers.php"),

        api("../api/items.php")

    ]);


    if (supplierResult.success) {

        suppliers =
            supplierResult.data || [];

    }


    if (itemResult.success) {

        items =
            itemResult.data || [];

    }
}


// ===============================
// CREATE FORM
// ===============================

async function createPurchasePage() {

    await loadMasters();


    const id =
        new URLSearchParams(
            location.search
        ).get("id");


    let existing = null;


    if (id) {

        const result =
            await api(
                "../api/purchase-orders.php?action=get&id="
                + encodeURIComponent(id)
            );


        if (result.success) {

            existing =
                result.data;

            editingId =
                id;
        }
    }


    layout(`

    <section class="page-head">

        <div>

            <h1>
                ${existing
                    ? "Edit"
                    : "Create"}
                Purchase Order
            </h1>

            <p>
                Enter purchase order details.
            </p>

        </div>

    </section>


    <form
        id="purchaseForm"
        class="panel">


        <h3>
            Purchase Order – Header
        </h3>


        <div class="form-grid">


            <label>

                Purchase Order Number

                <input
                    value="${
                        existing
                        ? existing.po_number
                        : "System Generated"
                    }"
                    disabled>

            </label>


            <label>

                PO Date

                <input
                    id="po_date"
                    type="date"
                    value="${
                        existing?.po_date ||
                        new Date()
                        .toISOString()
                        .slice(0, 10)
                    }"
                    required>

            </label>


            <label>

                Supplier

                <select
                    id="supplier"
                    required>

                    <option value="">
                        Select Supplier
                    </option>

                    ${suppliers.map(
                        supplier => `

                        <option
                            value="${supplier.name}"
                            ${
                                existing?.supplier ===
                                supplier.name
                                ? "selected"
                                : ""
                            }>

                            ${supplier.name}

                        </option>

                        `
                    ).join("")}

                </select>

            </label>


            <label>

                Expected Delivery Date

                <input
                    id="delivery_date"
                    type="date"
                    value="${
                        existing?.delivery_date ||
                        ""
                    }">

            </label>


            <label>

                Reference Number

                <input
                    id="reference"
                    value="${
                        existing?.reference ||
                        ""
                    }">

            </label>


            <label>

                Payment Terms

                <select id="payment_terms">

                    <option>30 Days</option>
                    <option>60 Days</option>
                    <option>Cash</option>
                    <option>Advance</option>

                </select>

            </label>


            <label>

                Delivery Location

                <input
                    id="location"
                    value="${
                        existing?.location ||
                        ""
                    }">

            </label>


            <label class="wide">

                Notes

                <textarea
                    id="notes">${
                        existing?.notes ||
                        ""
                    }</textarea>

            </label>

        </div>


        <h3>
            Purchase Order – Item Details
        </h3>


        <div class="table-wrap">

            <table class="item-table">

                <thead>

                    <tr>

                        <th>Item</th>

                        <th>Item Code</th>

                        <th>Description</th>

                        <th>Quantity</th>

                        <th>Unit</th>

                        <th>Unit Price</th>

                        <th>Discount %</th>

                        <th>Tax %</th>

                        <th>Line Total</th>

                        <th></th>

                    </tr>

                </thead>


                <tbody
                    id="itemRows">
                </tbody>

            </table>

        </div>


        <button
            type="button"
            class="btn btn-secondary"
            onclick="addItemRow()">

            + Add Item

        </button>


        <div class="summary">


            <div>

                <span>
                    Subtotal
                </span>

                <b id="subtotal">
                    0.00
                </b>

            </div>


            <div>

                <span>
                    Total Discount
                </span>

                <b id="totalDiscount">
                    0.00
                </b>

            </div>


            <div>

                <span>
                    Total Tax
                </span>

                <b id="totalTax">
                    0.00
                </b>

            </div>


            <label>

                Additional Charges

                <input
                    id="charges"
                    type="number"
                    min="0"
                    value="${
                        existing?.additional_charges ||
                        0
                    }">

            </label>


            <div class="grand">

                <span>
                    Grand Total
                </span>

                <b id="grandTotal">
                    0.00
                </b>

            </div>


        </div>


        <div class="form-actions">

            <button
                type="button"
                class="btn btn-secondary"
                onclick="
                savePurchaseOrder('Draft')">

                Save as Draft

            </button>


            <button
                type="button"
                class="btn btn-primary"
                onclick="
                savePurchaseOrder('Pending')">

                Submit

            </button>


            <a
                href="purchase-orders.html"
                class="btn btn-light">

                Cancel

            </a>

        </div>


    </form>

    `);


    document
        .getElementById("charges")
        .addEventListener(
            "input",
            calculateTotals
        );


    if (existing) {

        existing.items.forEach(
            item => addItemRow(item)
        );

    } else {

        addItemRow();

    }


    calculateTotals();
}


// ===============================
// ADD ITEM ROW
// ===============================

function addItemRow(data = {}) {

    const tbody =
        document.getElementById(
            "itemRows"
        );


    const row =
        document.createElement("tr");


    row.innerHTML = `

        <td>

            <select
                class="item-select"
                required>

                <option value="">
                    Select Item
                </option>

                ${items.map(
                    item => `

                    <option
                        value="${item.code}"
                        data-code="${item.code}"
                        data-description="${
                            escapeAttr(
                                item.description || ""
                            )
                        }"
                        data-unit="${
                            item.unit || "Nos"
                        }"
                        data-price="${
                            item.purchase_price || 0
                        }"
                        ${
                            data.item_code ===
                            item.code
                            ? "selected"
                            : ""
                        }>

                        ${item.code}
                        -
                        ${item.name}

                    </option>

                    `
                ).join("")}

            </select>

        </td>


        <td class="code-cell">
            ${data.item_code || ""}
        </td>


        <td>

            <input
                class="description"
                value="${
                    data.description || ""
                }">

        </td>


        <td>

            <input
                class="quantity"
                type="number"
                min="0.01"
                step="0.01"
                value="${
                    data.quantity || 1
                }">

        </td>


        <td class="unit-cell">
            ${data.unit || ""}
        </td>


        <td>

            <input
                class="unit-price"
                type="number"
                min="0"
                step="0.01"
                value="${
                    data.unit_price || 0
                }">

        </td>


        <td>

            <input
                class="discount"
                type="number"
                min="0"
                step="0.01"
                value="${
                    data.discount || 0
                }">

        </td>


        <td>

            <input
                class="tax"
                type="number"
                min="0"
                step="0.01"
                value="${
                    data.tax || 0
                }">

        </td>


        <td class="line-total">
            0.00
        </td>


        <td>

            <button
                type="button"
                class="icon-btn"
                onclick="
                this.closest('tr').remove();
                calculateTotals();
                ">

                ×

            </button>

        </td>

    `;


    tbody.appendChild(row);


    const select =
        row.querySelector(
            ".item-select"
        );


    select.addEventListener(
        "change",
        function () {

            const option =
                this.selectedOptions[0];


            row.querySelector(
                ".code-cell"
            ).textContent =
                option.dataset.code ||
                "";


            row.querySelector(
                ".description"
            ).value =
                option.dataset.description ||
                "";


            row.querySelector(
                ".unit-cell"
            ).textContent =
                option.dataset.unit ||
                "";


            row.querySelector(
                ".unit-price"
            ).value =
                option.dataset.price ||
                0;


            calculateTotals();

        }
    );


    row.querySelector(
        ".quantity"
    ).addEventListener(
        "input",
        calculateTotals
    );


    row.querySelector(
        ".unit-price"
    ).addEventListener(
        "input",
        calculateTotals
    );


    row.querySelector(
        ".discount"
    ).addEventListener(
        "input",
        calculateTotals
    );


    row.querySelector(
        ".tax"
    ).addEventListener(
        "input",
        calculateTotals
    );


    if (data.item_code) {

        select.dispatchEvent(
            new Event("change")
        );

    }
}


// ===============================
// CALCULATE TOTALS
// ===============================

function calculateTotals() {

    let subtotal = 0;
    let discount = 0;
    let tax = 0;


    document
        .querySelectorAll(
            "#itemRows tr"
        )
        .forEach(row => {

            const quantity =
                Number(
                    row.querySelector(
                        ".quantity"
                    ).value
                ) || 0;


            const price =
                Number(
                    row.querySelector(
                        ".unit-price"
                    ).value
                ) || 0;


            const discountPercent =
                Number(
                    row.querySelector(
                        ".discount"
                    ).value
                ) || 0;


            const taxPercent =
                Number(
                    row.querySelector(
                        ".tax"
                    ).value
                ) || 0;


            const base =
                quantity * price;


            const discountAmount =
                base *
                discountPercent /
                100;


            const taxable =
                base -
                discountAmount;


            const taxAmount =
                taxable *
                taxPercent /
                100;


            const lineTotal =
                taxable +
                taxAmount;


            row.querySelector(
                ".line-total"
            ).textContent =
                lineTotal.toFixed(2);


            subtotal += base;

            discount +=
                discountAmount;

            tax +=
                taxAmount;

        });


    const charges =
        Number(
            document.getElementById(
                "charges"
            ).value
        ) || 0;


    const grandTotal =
        subtotal -
        discount +
        tax +
        charges;


    document.getElementById(
        "subtotal"
    ).textContent =
        subtotal.toFixed(2);


    document.getElementById(
        "totalDiscount"
    ).textContent =
        discount.toFixed(2);


    document.getElementById(
        "totalTax"
    ).textContent =
        tax.toFixed(2);


    document.getElementById(
        "grandTotal"
    ).textContent =
        grandTotal.toFixed(2);
}


// ===============================
// SAVE PURCHASE ORDER
// ===============================

async function savePurchaseOrder(status) {

    const rows =
        document.querySelectorAll(
            "#itemRows tr"
        );


    if (rows.length === 0) {

        alert(
            "Add at least one item."
        );

        return;
    }


    const itemData = [];


    for (const row of rows) {

        const itemCode =
            row.querySelector(
                ".code-cell"
            ).textContent;


        const quantity =
            Number(
                row.querySelector(
                    ".quantity"
                ).value
            );


        if (!itemCode) {

            alert(
                "Please select an item."
            );

            return;
        }


        if (
            quantity <= 0 ||
            isNaN(quantity)
        ) {

            alert(
                "Quantity must be greater than 0."
            );

            return;
        }


        itemData.push({

            item_code:
                itemCode,

            description:
                row.querySelector(
                    ".description"
                ).value,

            quantity:
                quantity,

            unit:
                row.querySelector(
                    ".unit-cell"
                ).textContent,

            unit_price:
                Number(
                    row.querySelector(
                        ".unit-price"
                    ).value
                ) || 0,

            discount:
                Number(
                    row.querySelector(
                        ".discount"
                    ).value
                ) || 0,

            tax:
                Number(
                    row.querySelector(
                        ".tax"
                    ).value
                ) || 0,

            line_total:
                Number(
                    row.querySelector(
                        ".line-total"
                    ).textContent
                ) || 0

        });

    }


    const supplier =
        document.getElementById(
            "supplier"
        ).value;


    if (!supplier) {

        alert(
            "Please select supplier."
        );

        return;
    }


    const data = {

        id:
            editingId,

        po_date:
            document.getElementById(
                "po_date"
            ).value,

        supplier:
            supplier,

        delivery_date:
            document.getElementById(
                "delivery_date"
            ).value,

        reference:
            document.getElementById(
                "reference"
            ).value,

        payment_terms:
            document.getElementById(
                "payment_terms"
            ).value,

        location:
            document.getElementById(
                "location"
            ).value,

        notes:
            document.getElementById(
                "notes"
            ).value,

        items:
            itemData,

        subtotal:
            Number(
                document.getElementById(
                    "subtotal"
                ).textContent
            ),

        total_discount:
            Number(
                document.getElementById(
                    "totalDiscount"
                ).textContent
            ),

        total_tax:
            Number(
                document.getElementById(
                    "totalTax"
                ).textContent
            ),

        additional_charges:
            Number(
                document.getElementById(
                    "charges"
                ).value
            ) || 0,

        grand_total:
            Number(
                document.getElementById(
                    "grandTotal"
                ).textContent
            ),

        status:
            status

    };


    const result =
        await api(
            "../api/purchase-orders.php?action=save",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(data)
            }
        );


    alert(result.message);


    if (result.success) {

        location.href =
            "purchase-orders.html";

    }
}


// ===============================
// ESCAPE HTML
// ===============================

function escapeAttr(value) {

    return String(value)
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ===============================
// AUTH CHECK
// ===============================

fetch(
    "../api/login.php?action=me"
)
.then(
    response =>
        response.json()
)
.then(
    result => {

        if (!result.success) {

            location.href =
                "../login.html";

            return;
        }


        document.getElementById(
            "userName"
        ).textContent =
            result.data.name;

    }
);


// ===============================
// PAGE ROUTING
// ===============================

if (
    location.pathname.endsWith(
        "purchase-orders.html"
    )
) {

    purchaseOrderListPage();

} else {

    createPurchasePage();

}