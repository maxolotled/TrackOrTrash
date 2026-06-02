window.onload = function() { // if api keys already exist in local storage, skip login screen
    const storedID = localStorage.getItem("clientID");
    const storedSecret = localStorage.getItem("clientSecret");
    
    if (storedID && storedSecret) {
        viewDashboard();
    }
}

function SaveKeys() {
    const ID = document.getElementById("client-id").value;
    const Secret = document.getElementById("client-secret").value;

    if (ID === "" || Secret === "") { // Check if both fields actually have anything inside
        alert("Hey, fill in both fields!");
        return;
    }
    // Save the keys to LocalStorage, so they are securely stored on the user's device and not exposed to the server or external databases :)
    localStorage.setItem("clientID", ID);
    localStorage.setItem("clientSecret", Secret);
    alert("Your keys have been saved :)");
    viewDashboard();
}

function viewDashboard() {
    const loginScreen = document.getElementById("setup");
    const dashboardScreen = document.getElementById("dashboard");
    loginScreen.classList.add("hidden");
    dashboardScreen.classList.remove("hidden");
}