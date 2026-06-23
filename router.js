const gClientID = "713258863184-m3mbncfbeairrgu4m5kassaeb4ugi67t.apps.googleusercontent.com"
const redirectUri = window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5500"
    : "https://trackortrash.me";

function switchToYoutube() {
    localStorage.setItem("platform", "youtube")
    console.log("Switching to youtube.")
    const authEndpoint = "https://accounts.google.com/o/oauth2/v2/auth"
    const scopes = encodeURIComponent("https://www.googleapis.com/auth/youtube")
    const redirect = encodeURIComponent(redirectUri)
    const loginURL = `${authEndpoint}?client_id=${gClientID}&redirect_uri=${redirect}&scope=${scopes}&response_type=token`;
    window.location = loginURL
}

const hasGoogleToken = window.location.hash.includes("access_token");
const savedPlatform = localStorage.getItem("platform")
let platformToLoad = "spotify";

if (hasGoogleToken || savedPlatform === "youtube") {
    platformToLoad = "youtube"
} else if (savedPlatform === "spotify") {
    platformToLoad = "spotify"
}

localStorage.setItem("platform", platformToLoad)

function SaveKeys() { // save the api keys to localstorage
    platformToLoad = "spotify"
    localStorage.setItem("platform", "spotify")
    const ID = document.getElementById("client-id").value;
    const Secret = document.getElementById("client-secret").value;

    if (ID === "" || Secret === "") { // Check if both fields actually have anything inside
        alert("Please enter API credentials before signing in.")
        return;
    }
    // Save the keys to LocalStorage, so they are securely stored on the user's device and not exposed to the server or external databases :)
    localStorage.setItem("clientID", ID);
    localStorage.setItem("clientSecret", Secret);
    login();
}

function openTutorial() {
    window.open('https://docs.trackortrash.me/spotify', 'blank', 'noopener,noreferrer')
}

function login() {  // send the other to spotify's login page
    const liveID = localStorage.getItem("clientID"); 
    const authEndpoint = "https://accounts.spotify.com/authorize";
    const scopes = "playlist-read-private playlist-modify-private playlist-modify-public user-library-read user-library-modify playlist-modify-public streaming user-read-playback-state user-modify-playback-state";
    
    if (!liveID) {
        alert("No user ID found!")
        return;
    }

    const loginUrl = `${authEndpoint}?client_id=${liveID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
    window.location = loginUrl;
}

const script = document.createElement("script");
script.src = `${platformToLoad}.js`;
document.body.appendChild(script);