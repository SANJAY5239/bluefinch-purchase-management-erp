const app = document.getElementById("app");


function layout(content) {

    app.innerHTML = `

    <div class="layout">

        <aside class="sidebar">

            <div class="brand side-brand">
                BLUEFINCH <span>ERP</span>
            </div>

            <nav>

                <a class="active"
                   href="dashboard.html">
                    ▣ Dashboard
                </a>

                <a href="pages/purchase-orders.html">
                    ▤ Purchase Orders
                </a>

                <button class="nav-group"
                    onclick="
                    document
                    .getElementById('masterNav')
                    .classList.toggle('hidden')
                    ">
                    ▾ Masters
                </button>

                <div id="masterNav" class="subnav">

                    <a href="pages/suppliers.html">
                        Suppliers
                    </a>

                    <a href="pages/items.html">
                        Items
                    </a>

                </div>

            </nav>

            <button class="logout"
                onclick="logout()">
                ↪ Logout
            </button>

        </aside>


        <main class="main">

            <header class="topbar">

                <span>
                    ERP / Dashboard
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
        "api/login.php?action=logout",
        {
            method: "POST"
        }
    );

    window.location.href = "login.html";
}


async function loadDashboard() {

    try {

        const response =
            await fetch(
                "api/purchase-orders.php"
            );

        const result =
            await response.json();

        if (!result.success) {
            return;
        }

        const orders = result.data || [];

        const draft =
            orders.filter(
                x => x.status === "Draft"
            ).length;

        const pending =
            orders.filter(
                x => x.status === "Pending"
            ).length;

        const completed =
            orders.filter(
                x => x.status === "Completed"
            ).length;


        document.getElementById(
            "total"
        ).textContent = orders.length;

        document.getElementById(
            "draft"
        ).textContent = draft;

        document.getElementById(
            "pending"
        ).textContent = pending;

        document.getElementById(
            "completed"
        ).textContent = completed;


        const max =
            Math.max(orders.length, 1);


        document.getElementById(
            "barDraft"
        ).style.width =
            `${draft / max * 100}%`;

        document.getElementById(
            "barPending"
        ).style.width =
            `${pending / max * 100}%`;

        document.getElementById(
            "barCompleted"
        ).style.width =
            `${completed / max * 100}%`;

    } catch (error) {

        console.log(error);

    }
}


layout(`

<section class="page-head">

    <div>

        <h1>
            Purchase Dashboard
        </h1>

        <p>
            Quick overview of purchasing activities.
        </p>

    </div>

    <a
        href="pages/create-purchase.html"
        class="btn btn-primary">

        + Create Purchase Order

    </a>

</section>


<div class="cards">

    <div class="stat-card">
        <span>Total Purchase Orders</span>
        <strong id="total">0</strong>
    </div>

    <div class="stat-card">
        <span>Draft Purchase Orders</span>
        <strong id="draft">0</strong>
    </div>

    <div class="stat-card">
        <span>Pending Purchase Orders</span>
        <strong id="pending">0</strong>
    </div>

    <div class="stat-card">
        <span>Completed Purchase Orders</span>
        <strong id="completed">0</strong>
    </div>

</div>


<div class="panel">

    <div class="panel-title">
        Purchase Order Status
    </div>

    <div class="chart-row">

        <span>Draft</span>

        <div class="bar">
            <i id="barDraft"></i>
        </div>

    </div>


    <div class="chart-row">

        <span>Pending</span>

        <div class="bar">
            <i id="barPending"></i>
        </div>

    </div>


    <div class="chart-row">

        <span>Completed</span>

        <div class="bar">
            <i id="barCompleted"></i>
        </div>

    </div>

</div>

`);


fetch("api/login.php?action=me")
    .then(response => response.json())
    .then(result => {

        if (!result.success) {

            window.location.href =
                "login.html";

            return;
        }

        document.getElementById(
            "userName"
        ).textContent =
            result.data.name;

    });


loadDashboard();