let authToken = "";
let currentTracksList = [];
let currentTracksIndex = 0;
let currentTracksType = "";
let currentPlaylistId = "";

function init() {
    const hash = window.location.hash
    if (hash) {
        const params = new URLSearchParams(hash.replace("#", "?"));
        const token = params.get("access_token")
        if (token) {
            console.log("youtube token:" + token)
            window.location.hash = "";
            authToken = token;
            getPlaylists();
        }
    }
}

async function getPlaylists() { // pull the user's playlists from the spotify API
    const menuContainer = document.getElementById("menu-container");
    menuContainer.innerHTML = "";

    const likedCard = `
        <div class="menu-card liked-songs-card" onclick="startSorting('likes', 'LM')">
            <div class="card-art-placeholder">💖</div>
            <div class="card-info">
                <h3>Liked Songs</h3>
                <p>All your favorites</p>
            </div>
        </div>
    `;
    menuContainer.innerHTML += likedCard;
    try {
        const response = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50', {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const playlistData = await response.json();
        if (playlistData.items) {
            playlistData.items.forEach(playlist => { // for each playlist, make a new card and add to index.html
                const name = playlist.snippet.title;
                const id = playlist.id;
                const thumbnail = playlist.snippet.thumbnails
                const cover = thumbnail && thumbnail.medium ? thumbnail.medium.url : 'https://placehold.co/150?text=No+Cover';
                if (id.startsWith("HL") || id.startsWith("UU")) {
                    return; 
                }
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
        showToast("Error fetching playlists:" + error, true);
    }
}

function startSorting(type, id) {
    currentTracksType = type;
    const typekey = type === 'likes' ? 'likes' : id;
    const savedProgress = localStorage.getItem("YTprogress_" + typekey)
    if (savedProgress) {
        if (confirm("You have saved progress with this playlist. Would you like to continue where you left of?")) {
            const progress = JSON.parse(savedProgress)
            currentTracksType = progress.type
            currentTracksList = progress.list
            currentTracksIndex = progress.index
            viewDashboard();
            displayCurrentTrack();
            document.getElementById("stop").classList.remove("hidden")
            return;
        } else {
            localStorage.removeItem("YTprogress_" + typekey)
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

async function getLikedTracks() { // pull all liked songs from spotify
    currentTracksType = "likes"
    showToast("Getting your liked tracks..")
    let allTracks = []
    let nextPageToken = "";
    let keepGoing = true;
    while (keepGoing) {
        try {
            let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=LM&maxResults=50`
            if (nextPageToken) {
                url += `&pageToken=${nextPageToken}`
            }
            const response = await fetch(url, {
                method: 'GET',
                headers: {'Authorization': 'Bearer ' + authToken}
            });
            const data = await response.json();
            if (data.items) {
                allTracks = allTracks.concat(data.items);
            }
            if (data.nextPageToken) {
                nextPageToken = data.nextPageToken;
            } else {
                keepGoing = false;
            }
        } catch (error) {
            showToast(error.message, true)
            keepGoing = false;
        }
    }
    if (allTracks && allTracks.length > 0) {
        const cleanTracks = allTracks
        .filter(item => item.snippet && item.snippet.title !== "Deleted video" && item.snippet.title !== "Private video")
        .map(item => ({
            id: item.contentDetails.videoId,
            playlistItemId: item.id,
            name: item.snippet.title,
            artist: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
            cover: item.snippet.thumbnails && item.snippet.thumbnails.medium ? item.snippet.thumbnails.medium.url : 'https://placehold.co/150?text=No+Cover'
        }));
        currentTracksList = shuffle(cleanTracks);        
        currentTracksIndex = 0;
        displayCurrentTrack();
        document.getElementById("stop").classList.remove("hidden")
    } else {
        showToast("No liked songs found.", true)
        viewHome();
    }
}

async function getPlaylistTracks(id) { // pull all liked songs from spotify
    currentTracksType = "playlist"
    showToast("Getting your playlist tracks..")
    let allTracks = []
    let nextPageToken = "";
    let keepGoing = true;
    while (keepGoing) {
        try {
            let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${id}&maxResults=50`
            if (nextPageToken) {
                url += `&pageToken=${nextPageToken}`
            }
            const response = await fetch(url, {
                method: 'GET',
                headers: {'Authorization': 'Bearer ' + authToken}
            });
            const data = await response.json();
            if (data.items) {
                allTracks = allTracks.concat(data.items);
            }
            if (data.nextPageToken) {
                nextPageToken = data.nextPageToken;
            } else {
                keepGoing = false;
            }
        } catch (error) {
            showToast(error.message, true)
            keepGoing = false;
        }
    }
    if (allTracks && allTracks.length > 0) {
        const cleanTracks = allTracks
        .filter(item => item.snippet && item.snippet.title !== "Deleted video" && item.snippet.title !== "Private video")
        .map(item => ({
            id: item.contentDetails.videoId,
            playlistItemId: item.id,
            name: item.snippet.title,
            artist: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
            cover: item.snippet.thumbnails && item.snippet.thumbnails.medium ? item.snippet.thumbnails.medium.url : 'https://placehold.co/150?text=No+Cover'
        }));
        currentTracksList = shuffle(cleanTracks);        
        currentTracksIndex = 0;
        displayCurrentTrack();
        document.getElementById("stop").classList.remove("hidden")
    } else {
        showToast("No playlist songs found.", true)
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
function viewDashboard() { // view the sorting page
    document.getElementById("setup").classList.add("hidden")
    document.getElementById("home").classList.add("hidden")
    document.getElementById("dashboard").classList.remove("hidden")
    document.getElementById("stop").classList.add("hidden")
}

function displayCurrentTrack() {
    const track = currentTracksList[currentTracksIndex];
    if (!track) return;
    const title = track.name;
    const artist = track.artist
    const cover = track.cover
    playPreview(track.id);
    document.getElementById("track-art").src = cover;
    document.getElementById("track-title").innerText = title;
    document.getElementById("track-artist").innerText = artist;
    document.getElementById("track-counter").innerText = `${currentTracksIndex + 1} / ${currentTracksList.length}`
    console.log(`Now playing on Youtube: ${title} - ${artist}`)
    if (currentTracksType === 'likes') {
        document.getElementById("love").classList.add("hidden")
    } else {
        document.getElementById("love").classList.remove("hidden")
    }
}

function nextTrack() {
    const type = currentTracksType === 'likes' ? 'likes' : currentPlaylistId;
    currentTracksIndex = currentTracksIndex + 1
    if (currentTracksIndex >= currentTracksList.length) {
        viewHome();
        showToast("You've sorted through all songs!")
        localStorage.removeItem("YTprogress_" + type);
    } else {
        const progress = {
            type: currentTracksType,
            index: currentTracksIndex,
            list: currentTracksList
        }
        displayCurrentTrack();
        localStorage.setItem("YTprogress_" + type, JSON.stringify(progress));
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

function viewHome() {  // hide everything except for home
    // player.togglePlay();
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("home").classList.remove("hidden");
    document.getElementById("logout").classList.remove("hidden");
    document.getElementById("stop").classList.add("hidden")
    showToast("Both music & video playlists are shown. View the FAQ for more info.")
}
function stopSorting() {
    if(confirm('Stop sorting? Your progress will be saved.')) {
        viewHome();
        showToast("Your progress has been saved!")
    }
    playPreview("")
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

async function Trash() { // delete the song
    const card = document.querySelector(".track-card");
    card.classList.add("swipe-left");
    card.addEventListener("animationend", () => {
        card.classList.remove("swipe-left");
        nextTrack();
    }, { once: true }); 
    if (currentTracksType === "likes") {
        const currentItem = currentTracksList[currentTracksIndex];
        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos/rate?id=${currentItem.id}&rating=none`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + authToken
                }
            });
        } catch (error) {
            showToast("Network error:" + error, true);
        }
    } else {
        const currentItem = currentTracksList[currentTracksIndex];
        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?id=${currentItem.playlistItemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + authToken
                },
            });
        } catch (error) {
            showToast("Network error:" + error, true)
        }
    }
}
async function Love() {
    const card = document.querySelector(".track-card");
    card.classList.add("swipe-up");
    card.addEventListener("animationend", () => {
        card.classList.remove("swipe-up");
        nextTrack();
    }, { once: true });
    const currentItem = currentTracksList[currentTracksIndex];
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos/rate?id=${currentItem.id}&rating=like`, {
            method: 'POST',
            headers: {'Authorization': 'Bearer ' + authToken}
        });
    } catch (error) {
        showToast("Network error:" + error, true)
    }
}

function playPreview(id) {
    const player = document.getElementById("yt-preview-player");
    if (!player) return;
    if (!id) {
        player.src = "";
        return;
    }
    player.src = `https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1`
    console.log(`Now playing: youtu.be/${id}`)
}
init();