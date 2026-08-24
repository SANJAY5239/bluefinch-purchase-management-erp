const app = document.getElementById("app");

let editingItem = null;


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

                    <a href="suppliers.html">
                        Suppliers
                    </a>

                    <a
                        class="active"
                        href="items.html"
                    >
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
                    ERP / Items
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
 * LOAD ITEMS
 */

async function loadItems() {

    const response =
        await fetch(
            "../api/items.php"
        );

    const result =
        await response.json();


    if (!result.success) {
        return;
    }


    const tbody =
        document.getElementById(
            "itemRows"
        );


    tbody.innerHTML = "";


    result.data.forEach(item => {

        tbody.innerHTML += `

        <tr>

            <td>
                ${item.code || item.id}
            </td>

            <td>
                ${item.name}
            </td>

            <td>
                ${item.category || "-"}
            </td>

            <td>
                ${item.unit || "-"}
            </td>

            <td>
                ₹${Number(
                    item.purchase_price || 0
                ).toFixed(2)}
            </td>

            <td>
                ${item.tax || 0}%
            </td>

            <td>

                <span class="status active-status">
                    ${item.status || "Active"}
                </span>

            </td>

            <td>

                <button
                    class="link-btn"
                    onclick="editItem('${item.id}')"
                >
                    Edit
                </button>

                <button
                    class="link-btn danger-text"
                    onclick="deleteItem('${item.id}')"
                >
                    Delete
                </button>

            </td>

        </tr>

        `;
    });


    if (result.data.length === 0) {

        tbody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="empty"
            >
                No items found.
            </td>

        </tr>

        `;
    }
}


/*
 * ADD
 */

function openItemModal() {

    editingItem = null;

    document
        .getElementById("itemForm")
        .reset();


    document
        .getElementById("itemModal")
        .classList.remove("hidden");
}


/*
 * CLOSE
 */

function closeItemModal() {

    document
        .getElementById("itemModal")
        .classList.add("hidden");
}


/*
 * SAVE
 */

async function saveItem(event) {

    event.preventDefault();


    const form =
        document.getElementById(
            "itemForm"
        );


    const data =
        Object.fromEntries(
            new FormData(form).entries()
        );


    if (editingItem) {

        data.id =
            editingItem.id;
    }


    const response =
        await fetch(
            "../api/items.php?action=save",
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

        closeItemModal();

        loadItems();
    }
}


/*
 * EDIT
 */

async function editItem(id) {

    const response =
        await fetch(
            "../api/items.php"
        );


    const result =
        await response.json();


    const item =
        result.data.find(
            x => x.id === id
        );


    if (!item) {
        return;
    }


    editingItem =
        item;


    document.getElementById(
        "itemCode"
    ).value =
        item.code || "";


    document.getElementById(
        "itemName"
    ).value =
        item.name || "";


    document.getElementById(
        "description"
    ).value =
        item.description || "";


    document.getElementById(
        "category"
    ).value =
        item.category || "";


    document.getElementById(
        "unit"
    ).value =
        item.unit || "";


    document.getElementById(
        "purchasePrice"
    ).value =
        item.purchase_price || 0;


    document.getElementById(
        "tax"
    ).value =
        item.tax || 0;


    document.getElementById(
        "itemStatus"
    ).value =
        item.status || "Active";


    document
        .getElementById("itemModal")
        .classList.remove("hidden");
}


/*
 * DELETE
 */

async function deleteItem(id) {

    if (!confirm("Delete this item?")) {
        return;
    }


    const response =
        await fetch(
            "../api/items.php?action=delete",
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
        loadItems();
    }
}


/*
 * SEARCH
 */

function searchItems() {

    const search =
        document
            .getElementById(
                "itemSearch"
            )
            .value
            .toLowerCase();


    document
        .querySelectorAll(
            "#itemRows tr"
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
            Item Master
        </h1>

        <p>
            Manage items, pricing and tax.
        </p>

    </div>


    <button
        class="btn btn-primary"
        onclick="openItemModal()"
    >
        + Add Item
    </button>

</section>


<div class="panel">

    <div class="table-tools">

        <input
            id="itemSearch"
            placeholder="Search item..."
            oninput="searchItems()"
        >

    </div>


    <div class="table-wrap">

        <table>

            <thead>

                <tr>

                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Purchase Price</th>
                    <th>Tax</th>
                    <th>Status</th>
                    <th>Actions</th>

                </tr>

            </thead>


            <tbody id="itemRows"></tbody>

        </table>

    </div>

</div>


<div
    id="itemModal"
    class="modal hidden"
>

    <div class="modal-card">

        <div class="modal-head">

            <h2>
                Item Master
            </h2>

            <button
                onclick="closeItemModal()"
            >
                ×
            </button>

        </div>


        <form
            id="itemForm"
            onsubmit="saveItem(event)"
        >

            <div class="form-grid">

                <label>

                    Item Code

                    <input
                        id="itemCode"
                        name="code"
                        placeholder="Auto generated"
                    >

                </label>


                <label>

                    Item Name

                    <input
                        id="itemName"
                        name="name"
                        required
                    >

                </label>


                <label>

                    Category

                    <input
                        id="category"
                        name="category"
                    >

                </label>


                <label>

                    Unit

                    <input
                        id="unit"
                        name="unit"
                        value="Nos"
                    >

                </label>


                <label>

                    Purchase Price

                    <input
                        id="purchasePrice"
                        name="purchase_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value="0"
                    >

                </label>


                <label>

                    Tax %

                    <input
                        id="tax"
                        name="tax"
                        type="number"
                        min="0"
                        step="0.01"
                        value="0"
                    >

                </label>


                <label>

                    Status

                    <select
                        id="itemStatus"
                        name="status"
                    >

                        <option>
                            Active
                        </option>

                        <option>
                            Inactive
                        </option>

                    </select>

                </label>


                <label class="wide">

                    Description

                    <textarea
                        id="description"
                        name="description"
                    ></textarea>

                </label>

            </div>


            <div class="form-actions">

                <button
                    class="btn btn-primary"
                    type="submit"
                >
                    Save Item
                </button>

                <button
                    type="button"
                    class="btn btn-light"
                    onclick="closeItemModal()"
                >
                    Cancel
                </button>

            </div>

        </form>

    </div>

</div>

`);


loadItems();