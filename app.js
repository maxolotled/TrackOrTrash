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
            viewHome();
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
                const amtSongs = playlist.tracks.total;
                const cover = playlist.images && playlist.images[0] ? playlist.images[0].url : 'https://placehold.co/150?text=No+Cover';
                const playlistCard = `
                <div class="menu-card" onclick="startSorting('playlist', '${id}')">
                    <img src="${cover}" alt="${name} cover" class="card-art">
                    <div class="card-info">
                        <h3>${name}</h3>
                        <p>${amtSongs} songs</p>
                    </div>
                </div>
                `;
                menuContainer.innerHTML += playlistCard;
            });
        }
    } catch (error) {
        console.error("Error fetching playlists:", error);
    }
}
// async function getPlaylists() {
//      // get liked songs info from spotify
//      const responseLiked = await fetch ('https://api.spotify.com/v1/me/tracks', {
//         method: 'GET',
//         headers: {
//             'Authorization': 'Bearer ' + authToken
//         }
//      });

//      const likedSongs = await responseLiked.json();
//      console.log(likedSongs);
//          // get user playlists
//     const responsePlaylists = await fetch ('https://api.spotify.com/v1/me/playlists', {
//         method: 'GET',
//         headers: {
//             'Authorization': 'Bearer ' + authToken
//         }
//     });

//     const playlists = await responsePlaylists.json();
//     console.log(playlists); 
//     if (playlists.items.length > 0 || likedSongs.items.length > 0) {
//         viewHome();
//     } else {
//         alert("No playlists or liked songs found in your account! Please add some and try again :)");
//     }

function viewHome() { // hide dashboard and login, unhide homescreen
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("home").classList.remove("hidden");
}