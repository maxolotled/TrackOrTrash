let authToken = "";

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
init();