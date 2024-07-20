const { stringToJsonTimecode, jsonTimecodeToString } = require('./utils')

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

// const setSelectedClip = clipIndex => {
//     return clipIndex;
// };

const loadClipByCleanName = async (instance, cleanName) => {
    try {
        const response = await fetch(`http://${instance.config.host}:${instance.config.port}/API/PVS/timeline/active/clean-name/${encodeURIComponent(cleanName)}`, { method: 'POST' });
        const data = await response.json();
        return data.message;
    } catch (error) {
        throw new Error('Error loading clip: ' + error);
    }
};

// works
const jumpToTime = async (instance, time) => {
    try {
        const response = await fetch(`http://${instance.config.host}:${instance.config.port}/API/PVS/transport/jump/${time}`, { method: 'POST' });
        const data = await response.json();
        return data.message;
    } catch (error) {
        throw new Error('Error jumping to time: ' + error);
    }
};

//works
const jumpToEnd = async (instance, time) => {
    try {
        const response = await fetch(`http://${instance.config.host}:${instance.config.port}/API/PVS/transport/end/${time}`, { method: 'POST' });
        const data = await response.json();
        return data.message;
    } catch (error) {
        throw new Error('Error jumping to end: ' + error);
    }
};

//works
const requeueCurrentClip = async (instance) => {
    try {
        const response = await fetch(`http://${instance.config.host}:${instance.config.port}/API/PVS/timeline/recue`, { method: 'POST' });
        const data = await response.json();
        return data.message;
    } catch (error) {
        throw new Error('Error requeueing current clip: ' + error);
    }
};

//works
const queuePreviousClip = async (instance) => {
    try {
        const response = await fetch(`http://${instance.config.host}:${instance.config.port}/API/PVS/timeline/previous`, { method: 'POST' });
        const data = await response.json();
        return data.message;
    } catch (error) {
        throw new Error('Error queuing previous clip: ' + error);
    }
};


//works
const queueNextClip = async (instance) => {
    try {
        const response = await fetch(`http://${instance.config.host}:${instance.config.port}/API/PVS/timeline/next`, { method: 'POST' });
        const data = await response.json();
        return data.message;
    } catch (error) {
        throw new Error('Error queuing next clip: ' + error);
    }
};

const loadClipByName = async (instance, clipName) => {
    try {
        const response = await fetch(`http://${instance.config.host}:${instance.config.port}/API/PVS/timeline/active/name/${encodeURIComponent(clipName)}`, { method: 'POST' });
        const data = await response.json();
        return data.message;
    } catch (error) {
        throw new Error('Error loading clip by name: ' + error);
    }
};

// Basic Playback Control Actions
const fetchAndUpdateResponse = async (url, instance) => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        instance.updateStatus(data);
    } catch (error) {
        console.error(`Error fetching data: ${error}`);
    }
};

const handlePlay = async (instance) => {
    await fetchAndUpdateResponse(`http://${instance.config.host}:${instance.config.port}/API/PVS/transport/play`, instance);
};

const handlePause = async (instance) => {
    await fetchAndUpdateResponse(`http://${instance.config.host}:${instance.config.port}/API/PVS/transport/pause`, instance);
};

const handleToggle = async (instance) => {
    await fetchAndUpdateResponse(`http://${instance.config.host}:${instance.config.port}/API/PVS/transport/toggle`, instance);
};

const handleStop = async (instance) => {
    await fetchAndUpdateResponse(`http://${instance.config.host}:${instance.config.port}/API/PVS/transport/stop`, instance);
};

const handleLoadClipByIndex = async (instance, index) => {
    await fetchAndUpdateResponse(`http://${instance.config.host}:${instance.config.port}/API/PVS/timeline/active/id/${index}`, instance);
};

const updateClipTimersById = async (instance, clipId, timer, timecodeString) => {
    try {
        const jsonTimecode = stringToJsonTimecode(timecodeString);
        //console.log(jsonTimecodeToString(jsonTimecode))
        const response = await fetch(`http://${instance.config.host}:${instance.config.port}/API/PVS/playlist/id/${clipId}/times`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                timer,
                timecode: jsonTimecode
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data.message;
    } catch (error) {
        throw new Error('Error updating clip timers by ID: ' + error);
    }
};


module.exports = {
    fetchPlaylistData,
    findClipByClipName,
    //setSelectedClip,
    loadClipByCleanName,
    jumpToTime, //works
    jumpToEnd, //works
    requeueCurrentClip, // works
    queuePreviousClip, //works
    queueNextClip, //works
    loadClipByName, //works
    handlePlay, //works
    handlePause, //works
    handleStop, //works
    handleToggle, //works
    handleLoadClipByIndex, //works
    updateClipTimersById
};