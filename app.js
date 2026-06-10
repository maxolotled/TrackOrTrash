let authToken = "";
const redirectUri = "http://127.0.0.1:5500/trackortrash/index.html";
let currentTracksList = [];
let currentTracksIndex = 0;
let currentTracksType = "";
let player = null;
let spotifyDeviceId = null;
let currentPlaylistId = null;
let userID = null;

window.onload = function() {  // check on window load if already signed in
    // Rewritten by Gemini to fix bugs I could not find
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code'); 

    if (code) { // if returning from spotify sign in
        console.log("Authorization code gevonden: " + code);
        fetchToken(code);
    } 
    else {
        const storedID = localStorage.getItem("clientID");
        const storedSecret = localStorage.getItem("clientSecret");
        
        if (storedID && storedSecret) { // if api keys exist
            login();
        }
    }
}

function SaveKeys() { // save the api keys to localstorage
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

function login() {  // send the other to spotify's login page
    const liveID = localStorage.getItem("clientID"); 
    const authEndpoint = "https://accounts.spotify.com/authorize";
    const scopes = "playlist-read-private playlist-modify-private playlist-modify-public user-library-read user-library-modify playlist-modify-public streaming user-read-playback-state user-modify-playback-state";
    
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
            getUserID();
            getPlaylists();
        } else {
            console.error("Response obtained, but no access token found:", data);
        }
    }
    catch(error) {
        console.error('Error fetching token:', error);
    }
}
async function getPlaylists() { // pull the user's playlists from the spotify API
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
            playlistData.items.forEach(playlist => { // for each playlist, make a new card and add to index.html
                const name = playlist.name;
                const id = playlist.id;
                const owner = playlist.owner.id;
                const cover = playlist.images && playlist.images[0] ? playlist.images[0].url : 'https://placehold.co/150?text=No+Cover';
                if (playlist.owner.id === userID) {
                    const playlistCard = `
                    <div class="menu-card" onclick="startSorting('playlist', '${id}')">
                        <img src="${cover}" alt="${name} cover" class="card-art">
                        <div class="card-info">
                            <h3>${name}</h3>
                        </div>
                    </div>
                    `;
                    menuContainer.innerHTML += playlistCard;
                }
            });
            viewHome();
        }
    } catch (error) {
        console.error("Error fetching playlists:", error);
    }
}

function viewHome() {  // hide everything except for home
    pausePreview();
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("home").classList.remove("hidden");
    document.getElementById("logout").classList.remove("hidden");
}

function logout() { // delete api keys, sign out
    if(confirm('Remove all API keys and log out?')) {
        localStorage.removeItem("clientID");
        localStorage.removeItem("clientSecret");
        window.location.href = window.location.pathname;
    }
}

function startSorting(type, id) {
    viewDashboard();
    currentTracksType = type
    if (type === 'likes') {
        getLikedTracks();
    } else {
        currentPlaylistId = id;
        getPlaylistTracks(id);
    }
}

window.onSpotifyWebPlaybackSDKReady = function() {
    player = new Spotify.Player({
        getOAuthToken: cb => { cb(authToken); },
        name: "player",
        volume: 1
    })
    player.addListener('ready', ({device_id}) => {
    spotifyDeviceId = device_id;
    console.log("player ready" + device_id)
    });

    player.addListener('initialization_error', ({message}) => {
    console.log("player error" + message)
    });
    player.connect(); 
}
async function pausePreview() {
    const response = await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${spotifyDeviceId}`, {
        method: 'PUT',
        headers: {'Authorization': 'Bearer ' + authToken}
    });
}
async function playPreview(uri) {
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
        method: 'PUT',
        headers: {
            'content-type': 'application/json',
            'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify({ uris: [uri] }),
    });
    
    if (response.status === 204) {
        console.log("Track playing:", uri);
    } else {
        const err = await response.json();
        console.error("error when playing:", err);
    }
}

function displayCurrentTrack() {
    if (currentTracksType === 'likes') {
        const currentTrack = currentTracksList[currentTracksIndex];
        const track = currentTrack.track;
        const title = track.name;
        const artist = track.artists[0].name;
        let cover = "https://placehold.co/250?text=No+Cover"
        if (track.album && track.album.images && track.album.images[0]) {
            cover = track.album.images[0].url;
        }
        playPreview(track.uri);
        // const cover = track.album.images.url[0];
        console.log(track.album)
        document.getElementById("track-art").src = cover;
        document.getElementById("track-title").innerText = title;
        document.getElementById("track-artist").innerText = artist;
        console.log(`Now playing: ${title} - ${artist}`)
    } else {
        const currentTrack = currentTracksList[currentTracksIndex];
        const track = currentTrack.item;
        const title = track.name;
        const artist = track.artists[0].name;
        let cover = "https://placehold.co/250?text=No+Cover"
        if (track.album && track.album.images && track.album.images[0]) {
            cover = track.album.images[0].url;
        }
        playPreview(track.uri);
        // const cover = track.album.images.url[0];
        console.log(track.album)
        document.getElementById("track-art").src = cover;
        document.getElementById("track-title").innerText = title;
        document.getElementById("track-artist").innerText = artist;
        console.log(`Now playing: ${title} - ${artist}`)
    }
}
async function getUserID() {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            method: 'GET',
            headers: {'Authorization': 'Bearer ' + authToken}
        });
        const data = await response.json();
        userID = data.id;
        console.log('User ID:' + userID)
    } catch (error) {
        console.log(error);
    }
}

async function getLikedTracks() { // pull all liked songs from spotify
    let url = "https://api.spotify.com/v1/me/tracks"
    let allTracks = []
    while (url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {'Authorization': 'Bearer ' + authToken}
            });
            const data = await response.json();
            allTracks = allTracks.concat(data.items);
            url = data.next
        } catch (error) {
            console.error(error)
        }
    }
    if (allTracks && allTracks.length > 0) {
        currentTracksList = allTracks
        displayCurrentTrack();
    } else {
        alert("No liked songs found")
        viewHome();
    }
}

async function getPlaylistTracks(id) {
    console.log("Start getting playlist with id " + id)
    try {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${currentPlaylistId}/items`, {
            method: 'GET',
            headers: {'Authorization': 'Bearer ' + authToken}
        });
        const data = await response.json();
        console.log(data)
        if (data.items && data.items.length > 0) {
            currentTracksList = data.items;
            currentTracksIndex = 0;
            console.log("succesfully loaded playlist with id" + currentPlaylistId)
            displayCurrentTrack();
        } else {
            alert("Playlist is empty!")
            viewHome();
        }
    } catch (error) {
        console.log(error)
    }
}

function viewDashboard() { // view the sorting page
    document.getElementById("setup").classList.add("hidden")
    document.getElementById("home").classList.add("hidden")
    document.getElementById("dashboard").classList.remove("hidden")
}

async function Trash() { // delete the song

    if (currentTracksType === "likes") {
        const currentItem = currentTracksList[currentTracksIndex];
        const track = currentItem.track;
        const uri = track.uri; 
        try {
            const encodedUri = encodeURIComponent(uri);
            const response = await fetch(`https://api.spotify.com/v1/me/library?uris=${encodedUri}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + authToken
                }
            });

            if (response.status === 200) {
                console.log("Track deleted:", uri);
                nextTrack();
            } else {
                const err = await response.json();
                console.error("Error:", err);
                alert(`Error: ${err.error?.message || response.status}`);
            }
        } catch (error) {
            console.error("Network error:", error);
        }
    } else {
        const currentItem = currentTracksList[currentTracksIndex];
        const track = currentItem.item;
        const uri = track.uri; 
        try {
            const response = await fetch(`https://api.spotify.com/v1/playlists/${currentPlaylistId}/items`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + authToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ items: [{ uri: uri }] })
            });
            if (response.status === 200) {
                console.log("Track deleted:", uri)
                nextTrack()
            } else {
                const error = await response.json();
                console.error("Error when deleting. JSON:", error);
                alert(`Error while trashing song.`)
            }
        } catch (error) {
            console.error("network error:", error)
        }
    }
}

function Track() { // keep the song
    console.log("Song Tracked");
    nextTrack();
}

function nextTrack() {
    currentTracksIndex = currentTracksIndex + 1
    if (currentTracksIndex >= currentTracksList.length) {
        alert("Yay, you've sorted through all songs already! :)")
        viewHome();
    } else {
        displayCurrentTrack();
    }
}