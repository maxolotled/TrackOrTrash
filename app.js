let authToken = "";
const redirectUri = "http://127.0.0.1:5500/trackortrash/index.html";

window.onload = function() { 
    const storedID = localStorage.getItem("clientID");
    const storedSecret = localStorage.getItem("clientSecret");
    if (storedID && storedSecret) { // if keys already stored, skip login
        viewDashboard();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code'); // see if just returning from spotify login with code

    if (code) {
        console.log("Authorization code: " + code);
        fetchToken(code);
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

function viewDashboard() { // unhide dashboard, hide login
    const loginScreen = document.getElementById("setup");
    const dashboardScreen = document.getElementById("dashboard");
    loginScreen.classList.add("hidden");
    dashboardScreen.classList.remove("hidden");
}
function login() { // login to spotify using auth flow
    const storedID = localStorage.getItem("clientID");
    const storedSecret = localStorage.getItem("clientSecret");
    const authEndpoint = "https://accounts.spotify.com/authorize";
    const scopes = "playlist-read-private playlist-modify-private playlist-modify-public user-library-read user-library-modify";
    const loginUrl = `${authEndpoint}?client_id=${storedID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
    window.location = loginUrl;
}

async function fetchToken(code) { // get spotify authorization token
    const storedID = localStorage.getItem("clientID");
    const storedSecret = localStorage.getItem("clientSecret");
    const credentials = btoa(`${storedID}:${storedSecret}`);
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri
            })
        });
        const data = await response.json();

        if (data.access_token) {
            authToken = data.access_token;
            console.log("Access token: " + authToken);
            viewDashboard();
            window.history.pushState({}, document.title, window.location.pathname);
            getLikedSongs();
        } else {
            console.error("Response obtained, but no access token found:", data);
        }
    }
    catch(error) {
        console.error('Error fetching token:', error);
    }
}

async function getLikedSongs() {
     // get liked songs info from spotify
     const response = await fetch ('https://api.spotify.com/v1/me/tracks', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + authToken
        }
     });

     const playlists = await response.json();
     console.log(playlists);
}