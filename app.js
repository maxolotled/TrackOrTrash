let authToken = "";
const redirectUri = "http://127.0.0.1:5500/trackortrash/index.html";

window.onload = function() { 
    // 1. Check ALTIJD eerst of we net terugkomen van Spotify met een code!
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code'); 

    if (code) {
        // We hebben een code! Direct omruilen en NIET opnieuw inloggen.
        console.log("Authorization code gevonden: " + code);
        fetchToken(code);
    } 
    else {
        // We hebben GEEN code in de URL. Nu pas kijken we of we automatisch kunnen inloggen.
        const storedID = localStorage.getItem("clientID");
        const storedSecret = localStorage.getItem("clientSecret");
        
        if (storedID && storedSecret) { 
            console.log("Sleutels gevonden! Automatisch doorsturen naar Spotify...");
            login();
        }
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
    login();
}

function viewDashboard() { // unhide dashboard, hide login
    const loginScreen = document.getElementById("setup");
    const dashboardScreen = document.getElementById("dashboard");
    loginScreen.classList.add("hidden");
    dashboardScreen.classList.remove("hidden");
    document.getElementById("home").classList.add("hidden");
    setTimeout((login), 3000);
}

function login() { 
    const liveID = localStorage.getItem("clientID"); 
    const authEndpoint = "https://accounts.spotify.com/authorize";
    const scopes = "playlist-read-private playlist-modify-private playlist-modify-public user-library-read user-library-modify";
    
    if (!liveID) {
        alert("No client ID found!");
        return;
    }

    const loginUrl = `${authEndpoint}?client_id=${liveID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
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
            window.history.pushState({}, document.title, window.location.pathname);
            getPlaylists();
        } else {
            console.error("Response obtained, but no access token found:", data);
        }
    }
    catch(error) {
        console.error('Error fetching token:', error);
    }
}
async function getPlaylists() {
    const menuContainer = document.getElementById("menu-container");
    menuContainer.innerHTML = "";

    const likedCard = `
        <div class="menu-card liked-songs-card" onclick="startSorting('likes', 'me')">
            <div class="card-art-placeholder">💖</div>
            <div class="card-info">
                <h3>Liked Songs</h3>
                <p>All your favorites</p>
            </div>
        </div>
    `;
    menuContainer.innerHTML += likedCard;
    try {
        const response = await fetch('https://api.spotify.com/v1/me/playlists', {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const playlistData = await response.json();
        if (playlistData.items) {
            playlistData.items.forEach(playlist => {
                const name = playlist.name;
                const id = playlist.id;
                let amtSongs = 0; // We beginnen op 0
                if (playlist.tracks && playlist.tracks.total !== undefined) {
                amtSongs = playlist.tracks.total; // Als het bestaat, overschrijven we de 0
                }
                console.log(`${name} - ${amtSongs} songs`);
                const cover = playlist.images && playlist.images[0] ? playlist.images[0].url : 'https://placehold.co/150?text=No+Cover';
                const playlistCard = `
                <div class="menu-card" onclick="startSorting('playlist', '${id}')">
                    <img src="${cover}" alt="${name} cover" class="card-art">
                    <div class="card-info">
                        <h3>${name}</h3>
                    </div>
                </div>
                `;
                menuContainer.innerHTML += playlistCard;
            });
            viewHome();
        }
    } catch (error) {
        console.error("Error fetching playlists:", error);
    }
}

function viewHome() { // hide dashboard and login, unhide homescreen
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("home").classList.remove("hidden");
}