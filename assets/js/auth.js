const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

function showMessage(text, success = false) {

    message.innerHTML = `
        <div class="alert ${success ? "success" : "error"}">
            ${text}
        </div>
    `;
}


// REGISTER
if (registerForm) {

    registerForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const data = Object.fromEntries(
            new FormData(registerForm).entries()
        );

        if (data.password !== data.confirm_password) {
            showMessage("Passwords do not match.");
            return;
        }

        try {

            const response = await fetch(
                "api/register.php?action=register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );

            const result = await response.json();

            showMessage(result.message, result.success);

            if (result.success) {

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1000);

            }

        } catch (error) {

            showMessage(
                "Cannot connect to PHP backend. Start Apache in XAMPP."
            );

        }

    });

}


// LOGIN
if (loginForm) {

    loginForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const data = Object.fromEntries(
            new FormData(loginForm).entries()
        );

        try {

            const response = await fetch(
                "api/login.php",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );

            const result = await response.json();

            showMessage(result.message, result.success);

            if (result.success) {
                window.location.href = "dashboard.html";
            }

        } catch (error) {

            showMessage(
                "Cannot connect to PHP backend. Start Apache in XAMPP."
            );

        }

    });

}