let authToken = "";
let currentTracksList = [];
let currentTracksIndex = 0;
let currentTracksType = "";
let player = null;
let spotifyDeviceId = null;
let currentPlaylistId = null;
let userID = null;

function init() {  // check on window load if already signed in
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
            if(document.getElementById("client-id")) {
                document.getElementById("client-id").value = storedID
                document.getElementById("client-secret").value = storedSecret
                showToast("Loaded your saved spotify credentials!")
            }
        }
    }
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
            showToast("Logged in!")
            console.log("Access token: " + authToken);
            window.history.pushState({}, document.title, window.location.pathname);
            await getUserID();
            getPlaylists();
        } else {
            showToast("Response obtained, but no access token found!", true);
        }
    }
    catch(error) {
        showToast('Error fetching token:' + error, true);
    }
}

function showToast(message, isError) {
    if (isError === true) {
        document.getElementById("toast").classList.add("error");
    } else {
        document.getElementById("toast").classList.add("success");
    }
    document.getElementById("toast").innerText = message;
    document.getElementById("toast").classList.remove("hidden");
    setTimeout(() => {
        document.getElementById("toast").classList.add("hidden")
        document.getElementById("toast").classList.remove("error", "succes")
    }, 3000)
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
        showToast("Error fetching playlists:" + error, true);
    }
}

function viewHome() {  // hide everything except for home
    player.togglePlay();
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("home").classList.remove("hidden");
    document.getElementById("logout").classList.remove("hidden");
    document.getElementById("stop").classList.add("hidden")
}

function logout() { // delete api keys, sign out
    if(confirm('Remove all API keys and log out?')) {
        localStorage.removeItem("clientID");
        localStorage.removeItem("clientSecret");
        window.location.href = window.location.pathname;
    }
}

function startSorting(type, id) {
    currentTracksType = type;
    const typekey = type === 'likes' ? 'likes' : id;
    const savedProgress = localStorage.getItem("progress_" + typekey)
    if (savedProgress) {
        if (confirm("You have saved progress with this playlist. Would you like to continue where you left of?")) {
            progress = JSON.parse(savedProgress)
            currentTracksType = progress.type
            currentTracksList = progress.list
            currentTracksIndex = progress.index
            viewDashboard();
            displayCurrentTrack();
            document.getElementById("stop").classList.remove("hidden")
            return;
        } else {
            localStorage.removeItem("progress_" + typekey)
            viewDashboard();
        }
    }
    viewDashboard();
    if (type === 'likes') {
        currentPlaylistId = 'likes';
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
    showToast("Player error:" + message, true)
    });
    player.connect(); 
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
        showToast(`Error when playing: ${err.error?.message}`, true);
    }
}

function displayCurrentTrack() {
    const currentTrack = currentTracksList[currentTracksIndex];
    const track = currentTracksType === 'likes' ? currentTrack.track : currentTrack.item;
    const title = track.name;
    const artist = track.artists[0].name;
    let cover = "https://placehold.co/250?text=No+Cover"
    if (track.album && track.album.images && track.album.images[0]) {
        cover = track.album.images[0].url;
    }
    playPreview(track.uri);
    document.getElementById("track-art").src = cover;
    document.getElementById("track-title").innerText = title;
    document.getElementById("track-artist").innerText = artist;
    document.getElementById("track-counter").innerText = `${currentTracksIndex + 1} / ${currentTracksList.length}`
    console.log(`Now playing: ${title} - ${artist}`)
    if (currentTracksType === 'likes') {
        document.getElementById("love").classList.add("hidden")
    } else {
        document.getElementById("love").classList.remove("hidden")
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
        showToast(error.message, true);
    }
}

async function getLikedTracks() { // pull all liked songs from spotify
    showToast("Getting your liked tracks..")
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
            showToast(error.message, true)
        }
    }
    if (allTracks && allTracks.length > 0) {
        currentTracksList = shuffle(allTracks.filter(item => item.track != null));        currentTracksIndex = 0
        displayCurrentTrack();
        document.getElementById("stop").classList.remove("hidden")
    } else {
        showToast("No liked songs found.", true)
        viewHome();
    }
}
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
async function getPlaylistTracks(id) {
    showToast("Getting your playlist tracks..")
    console.log("Start getting playlist with id " + id)
    let url = `https://api.spotify.com/v1/playlists/${currentPlaylistId}/items`
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
            showToast(error.message, true)
        }
    }
    if (allTracks && allTracks.length > 0) {
        currentTracksList = shuffle(allTracks.filter(item => item.item != null));        currentTracksIndex = 0;
        displayCurrentTrack();
        document.getElementById("stop").classList.remove("hidden")
    } else {
        showToast("Playlist is empty!", true)
        viewHome();
    }
}
function stopSorting() {
    if(confirm('Stop sorting? Your progress will be saved.')) {
        viewHome();
        showToast("Your progress has been saved!")
    }
}
function viewDashboard() { // view the sorting page
    document.getElementById("setup").classList.add("hidden")
    document.getElementById("home").classList.add("hidden")
    document.getElementById("dashboard").classList.remove("hidden")
    document.getElementById("stop").classList.add("hidden")
}

async function Trash() { // delete the song
    const card = document.querySelector(".track-card");
    card.classList.add("swipe-left");
    card.addEventListener("animationend", () => {
        card.classList.remove("swipe-left");
        nextTrack();
    }, { once: true }); 
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
                showToast("Song trashed!", true)
            } else {
                const err = await response.json();
                showToast(`An error occured while deleting song: ${err.error?.message || response.status}`, true)
            }
        } catch (error) {
            showToast("Network error:" + error, true);
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
                showToast("Song trashed!", true)
                console.log("Track deleted:", uri)
            } else {
                const error = await response.json();
                showToast("Error when deleting:" + error, true);
            }
        } catch (error) {
            showToast("Network error:" + error, true)
        }
    }
}

function Track() { // keep the song
    const card = document.querySelector(".track-card");
    card.classList.add("swipe-right");
    card.addEventListener("animationend", () => {
        card.classList.remove("swipe-right");
        nextTrack();
    }, { once: true });
    showToast("Song kept!")
    console.log("Song Tracked");
}

async function Love() { // for normal playlists only: add song to liked songs
    const card = document.querySelector(".track-card");
    card.classList.add("swipe-up");
    card.addEventListener("animationend", () => {
        card.classList.remove("swipe-up");
        nextTrack();
    }, { once: true });
    const currentTrack = currentTracksList[currentTracksIndex]
    const track = currentTrack.item;
    const uri = track.uri;
    try {
        const encodedUri = encodeURIComponent(uri);
        const response = await fetch(`https://api.spotify.com/v1/me/library?uris=${encodedUri}`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });

        if (response.status === 200) {
            console.log("Song loved:", uri)
            showToast("Song added to liked songs!")
        } else {
            const err = await response.json();
            showToast(`An error occured while adding song to liked songs: ${err.error?.message || response.status}`, true)
        }
    } catch {
        console.log("error when putting to api")
        showToast(`An error occured while trashing song.`, true)
    }
}

function nextTrack() {
    const type = currentTracksType === 'likes' ? 'likes' : currentPlaylistId;
    currentTracksIndex = currentTracksIndex + 1
    if (currentTracksIndex >= currentTracksList.length) {
        viewHome();
        showToast("You've sorted through all songs!")
        localStorage.removeItem("progress_" + type);
    } else {
        const progress = {
            type: currentTracksType,
            index: currentTracksIndex,
            list: currentTracksList
        }
        displayCurrentTrack();
        localStorage.setItem("progress_" + type, JSON.stringify(progress));
    }
}

document.addEventListener("keydown", (e) => {
    if (document.getElementById("dashboard").classList.contains("hidden")) return;
    if (e.key === "ArrowLeft") Trash();
    if (e.key === "ArrowRight") Track();
    if (e.key === "ArrowUp") Love();
    if (e.key === " ") {
        e.preventDefault();
        player.togglePlay();
        showToast("Song (un)paused.")
    }
});

const hammer = new Hammer(document.body);
hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
hammer.on('swipeleft swiperight swipeup', (e) => {
    if (document.getElementById("dashboard").classList.contains("hidden")) return;
    if (e.type === 'swipeleft') Trash();
    if (e.type === 'swiperight') Track();
    if (e.type === 'swipeup') {
        if(!document.getElementById("love").classList.contains("hidden")) {
            Love();
        }
    }
})
init();