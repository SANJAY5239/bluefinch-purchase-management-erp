const app = document.getElementById("app");

let editingSupplier = null;


function createLayout(content) {

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

                <a href="purchase-orders.html">
                    ▤ Purchase Orders
                </a>

                <button
                    class="nav-group"
                    onclick="
                    document
                    .getElementById('masterNav')
                    .classList.toggle('hidden')
                    "
                >
                    ▾ Masters
                </button>

                <div
                    id="masterNav"
                    class="subnav"
                >

                    <a
                        class="active"
                        href="suppliers.html"
                    >
                        Suppliers
                    </a>

                    <a href="items.html">
                        Items
                    </a>

                </div>

            </nav>

            <button
                class="logout"
                onclick="logout()"
            >
                ↪ Logout
            </button>

        </aside>


        <main class="main">

            <header class="topbar">

                <span>
                    ERP / Suppliers
                </span>

                <span id="userName"></span>

            </header>

            ${content}

        </main>

    </div>

    `;


    checkLogin();
}


async function checkLogin() {

    const response =
        await fetch(
            "../api/login.php?action=me"
        );

    const result =
        await response.json();

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


/*
 * LOAD SUPPLIERS
 */

async function loadSuppliers() {

    const response =
        await fetch(
            "../api/suppliers.php"
        );

    const result =
        await response.json();


    if (!result.success) {
        return;
    }


    const tbody =
        document.getElementById(
            "supplierRows"
        );


    tbody.innerHTML = "";


    result.data.forEach(
        supplier => {

            tbody.innerHTML += `

            <tr>

                <td>
                    ${supplier.code || supplier.id}
                </td>

                <td>
                    ${supplier.name}
                </td>

                <td>
                    ${supplier.contact_person || "-"}
                </td>

                <td>
                    ${supplier.phone || "-"}
                </td>

                <td>
                    ${supplier.email || "-"}
                </td>

                <td>
                    <span class="status active-status">
                        ${supplier.status || "Active"}
                    </span>
                </td>

                <td>

                    <button
                        class="link-btn"
                        onclick="editSupplier('${supplier.id}')"
                    >
                        Edit
                    </button>

                    <button
                        class="link-btn danger-text"
                        onclick="deleteSupplier('${supplier.id}')"
                    >
                        Delete
                    </button>

                </td>

            </tr>

            `;
        }
    );


    if (result.data.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty"
                >
                    No suppliers found.
                </td>
            </tr>
        `;
    }
}


/*
 * OPEN MODAL
 */

function openSupplierModal() {

    editingSupplier = null;

    document
        .getElementById("supplierForm")
        .reset();

    document
        .getElementById("supplierModal")
        .classList.remove("hidden");

}


/*
 * CLOSE MODAL
 */

function closeSupplierModal() {

    document
        .getElementById("supplierModal")
        .classList.add("hidden");
}


/*
 * SAVE
 */

async function saveSupplier(event) {

    event.preventDefault();


    const form =
        document.getElementById(
            "supplierForm"
        );


    const data =
        Object.fromEntries(
            new FormData(form).entries()
        );


    if (editingSupplier) {

        data.id =
            editingSupplier.id;
    }


    const response =
        await fetch(
            "../api/suppliers.php?action=save",
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


    const result =
        await response.json();


    alert(result.message);


    if (result.success) {

        closeSupplierModal();

        loadSuppliers();
    }
}


/*
 * EDIT
 */

async function editSupplier(id) {

    const response =
        await fetch(
            "../api/suppliers.php"
        );

    const result =
        await response.json();


    const supplier =
        result.data.find(
            item => item.id === id
        );


    if (!supplier) {
        return;
    }


    editingSupplier =
        supplier;


    document.getElementById("supplierCode").value =
        supplier.code || "";

    document.getElementById("supplierName").value =
        supplier.name || "";

    document.getElementById("contactPerson").value =
        supplier.contact_person || "";

    document.getElementById("phone").value =
        supplier.phone || "";

    document.getElementById("email").value =
        supplier.email || "";

    document.getElementById("taxNumber").value =
        supplier.tax_number || "";

    document.getElementById("paymentTerms").value =
        supplier.payment_terms || "30 Days";

    document.getElementById("status").value =
        supplier.status || "Active";

    document.getElementById("address").value =
        supplier.address || "";


    document
        .getElementById("supplierModal")
        .classList.remove("hidden");
}


/*
 * DELETE
 */

async function deleteSupplier(id) {

    if (!confirm("Delete this supplier?")) {
        return;
    }


    const response =
        await fetch(
            "../api/suppliers.php?action=delete",
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


    const result =
        await response.json();


    alert(result.message);


    if (result.success) {
        loadSuppliers();
    }
}


/*
 * SEARCH
 */

function searchSuppliers() {

    const search =
        document
            .getElementById("supplierSearch")
            .value
            .toLowerCase();


    document
        .querySelectorAll(
            "#supplierRows tr"
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


createLayout(`

<section class="page-head">

    <div>

        <h1>
            Supplier Master
        </h1>

        <p>
            Manage supplier information.
        </p>

    </div>

    <button
        class="btn btn-primary"
        onclick="openSupplierModal()"
    >
        + Add Supplier
    </button>

</section>


<div class="panel">

    <div class="table-tools">

        <input
            id="supplierSearch"
            placeholder="Search supplier..."
            oninput="searchSuppliers()"
        >

    </div>


    <div class="table-wrap">

        <table>

            <thead>

                <tr>

                    <th>Supplier Code</th>
                    <th>Supplier Name</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>

                </tr>

            </thead>


            <tbody id="supplierRows"></tbody>

        </table>

    </div>

</div>


<div
    id="supplierModal"
    class="modal hidden"
>

    <div class="modal-card">

        <div class="modal-head">

            <h2>
                Supplier
            </h2>

            <button
                onclick="closeSupplierModal()"
            >
                ×
            </button>

        </div>


        <form
            id="supplierForm"
            onsubmit="saveSupplier(event)"
        >

            <div class="form-grid">

                <label>
                    Supplier Code
                    <input
                        id="supplierCode"
                        name="code"
                        placeholder="Auto generated"
                    >
                </label>


                <label>
                    Supplier Name
                    <input
                        id="supplierName"
                        name="name"
                        required
                    >
                </label>


                <label>
                    Contact Person
                    <input
                        id="contactPerson"
                        name="contact_person"
                    >
                </label>


                <label>
                    Phone
                    <input
                        id="phone"
                        name="phone"
                    >
                </label>


                <label>
                    Email
                    <input
                        id="email"
                        name="email"
                        type="email"
                    >
                </label>


                <label>
                    Tax / VAT Number
                    <input
                        id="taxNumber"
                        name="tax_number"
                    >
                </label>


                <label>
                    Payment Terms
                    <select
                        id="paymentTerms"
                        name="payment_terms"
                    >
                        <option>30 Days</option>
                        <option>60 Days</option>
                        <option>90 Days</option>
                        <option>Cash</option>
                    </select>
                </label>


                <label>
                    Status
                    <select
                        id="status"
                        name="status"
                    >
                        <option>Active</option>
                        <option>Inactive</option>
                    </select>
                </label>


                <label class="wide">
                    Address
                    <textarea
                        id="address"
                        name="address"
                    ></textarea>
                </label>

            </div>


            <div class="form-actions">

                <button
                    class="btn btn-primary"
                    type="submit"
                >
                    Save Supplier
                </button>

                <button
                    type="button"
                    class="btn btn-light"
                    onclick="closeSupplierModal()"
                >
                    Cancel
                </button>

            </div>

        </form>

    </div>

</div>

`);


loadSuppliers();