const DEMO_EMAIL = "admin@bluefinch.com";
const DEMO_PASSWORD = "Bluefinch@123";

document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");

    if (!loginForm) return;

    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const message = document.getElementById("message");

        if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {

            message.innerHTML = `
                <div class="success-message">
                    Login successful! Redirecting...
                </div>
            `;

            setTimeout(function () {
                window.location.href = "dashboard.html";
            }, 500);

        } else {

            message.innerHTML = `
                <div class="error-message">
                    Invalid email or password.
                </div>
            `;
        }
    });

});