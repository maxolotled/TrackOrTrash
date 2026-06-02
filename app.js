const storedID = localStorage.getItem("clientID");
const storedSecret = localStorage.getItem("clientSecret");

window.onload = function() { // if api keys already exist in local storage, skip login screen
    
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

async function fetchToken() {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&client_id=' + storedID + '&client_secret='+ storedSecret
    });
    const data = await response.json();
    console.log(data);
}