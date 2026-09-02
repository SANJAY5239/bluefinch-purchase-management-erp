function requireLogin(){

    if(sessionStorage.getItem("bluefinch_logged_in") !== "true"){
        window.location.href = "../login.html";
    }

}

function logout(){

    sessionStorage.removeItem("bluefinch_logged_in");

    window.location.href = "../login.html";

}

function showToast(message, error = false){

    const toast = document.getElementById("toast");

    if(!toast) return;

    toast.innerText = message;

    toast.style.background = error
        ? "#b91c1c"
        : "#111827";

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);

}

function escapeHTML(value){

    if(value === null || value === undefined){
        return "";
    }

    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}

function formatMoney(value){

    return "₹ " + Number(value || 0).toLocaleString("en-IN",{
        minimumFractionDigits:2,
        maximumFractionDigits:2
    });

}

function statusBadge(status){

    const value = String(status || "").toLowerCase();

    let cls = "badge-draft";

    if(value === "pending"){
        cls = "badge-pending";
    }

    if(value === "completed" || value === "active"){
        cls = "badge-completed";
    }

    if(value === "cancelled" || value === "inactive"){
        cls = "badge-cancelled";
    }

    return `<span class="badge ${cls}">
        ${escapeHTML(status)}
    </span>`;

}

function initSidebarDropdowns(){

    const dropdownButtons = document.querySelectorAll(".nav-dropdown-btn");

    dropdownButtons.forEach(button => {

        button.addEventListener("click", function(e){

            e.preventDefault();

            const dropdown = this.closest(".nav-dropdown");

            if(!dropdown) return;

            const isOpen = dropdown.classList.contains("open");

            if(isOpen){
                dropdown.classList.remove("open");
                this.setAttribute("aria-expanded", "false");
            }else{
                dropdown.classList.add("open");
                this.setAttribute("aria-expanded", "true");
            }

        });

    });

}

document.addEventListener("DOMContentLoaded", function(){

    requireLogin();

    initSidebarDropdowns();

    const logoutButton = document.getElementById("logoutBtn");

    if(logoutButton){
        logoutButton.addEventListener("click", logout);
    }

});