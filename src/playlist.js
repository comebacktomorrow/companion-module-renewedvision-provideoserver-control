// playlist.js

let playlistData = [];

async function fetchPlaylistData(host, port) {
    try {
        console.log('Fetching playlist data from', `http://${host}:${port}/API/PVS/playlist`);
        const response = await fetch(`http://${host}:${port}/API/PVS/playlist`);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        playlistData = data; // Update playlistData with fetched data
        console.log('got playlist data');
        return data; // Return data for chaining
    } catch (error) {
        console.error('Error fetching playlist data:', error);
        throw error; // Propagate the error
    }
}

function findClipByClipName(clipName){
    const thisClip = playlistData.find((clip) => clip.plnName === clipName);
    return thisClip || null; // Return clipInfo if found, otherwise null
};

function setSelectedClip(clipIndex){
    return clipIndex; // Return the selected clip index
};

async function loadClipByCleanName(host, port, cleanName){
    try {
        const response = await fetch(`http://${host}:${port}/API/PVS/timeline/active/clean-name/${encodeURIComponent(cleanName)}`, { method: 'POST' });
        const data = await response.json();
        return data.message;
    } catch (error) {
        throw new Error('Error loading clip: ' + error);
    }
};

module.exports = {
    fetchPlaylistData,
    findClipByClipName,
    setSelectedClip,
    loadClipByCleanName,
  };