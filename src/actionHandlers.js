

let playlistData = [];

const fetchPlaylistData = async (instance) => {
    try {
        const response = await fetch(`http://${instance.config.host}:${instance.config.port}/API/PVS/playlist`);
        const data = await response.json();
        playlistData = data;
        return playlistData;
    } catch (error) {
        console.error('Error fetching playlist data:', error);
        throw error;
    }
};

const findClipByClipName = clipName => {
    const thisClip = playlistData.find(clip => clip.plnName === clipName);
    return thisClip || null;
};

const setSelectedClip = clipIndex => {
    return clipIndex;
};

const loadClipByCleanName = async (instance, cleanName) => {
    try {
        const response = await fetch(`http://${instance.config.host}:${instance.config.port}/API/PVS/timeline/active/clean-name/${encodeURIComponent(cleanName)}`, { method: 'POST' });
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
    loadClipByCleanName
};