document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");
    const message = document.getElementById("message");

    // Demo login credentials
    const DEMO_EMAIL = "admin@bluefinch.com";
    const DEMO_PASSWORD = "Bluefinch@123";

    if (!loginForm) {
        return;
    }

    loginForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        // Check login credentials
        if (
            email === DEMO_EMAIL &&
            password === DEMO_PASSWORD
        ) {

            message.innerHTML = `
                <div class="success-message">
                    Login successful! Redirecting...
                </div>
            `;

            // Save login status
            sessionStorage.setItem("bluefinchLoggedIn", "true");

            // Redirect to dashboard
            setTimeout(function () {
                window.location.href = "./dashboard.html";
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