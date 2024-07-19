const { timecodeToTotalFrames } = require('./utils') 

let currentLibraryTimeStamp;
let previousClip = {};
let currentTimecode = 0;
let currentTally = -1;

const updateStatus = (socketData, updateHandlers) => {
    const {
        onLibraryUpdate,
        onStateChange,
        onClipChange,
        onTimecodeUpdate,
        onTallyUpdate,
    } = updateHandlers;

    if (currentLibraryTimeStamp !== socketData.libraryTimestamp) {
        currentLibraryTimeStamp = socketData.libraryTimestamp;
        onLibraryUpdate(socketData);
    }

    if (socketData.state !== previousClip.state) {
        onStateChange(socketData);
    }

    if (socketData.clipName !== previousClip.clipName) {
        onClipChange(socketData);
    }

    if (timecodeToTotalFrames(currentTimecode) !== timecodeToTotalFrames(socketData.timecode)) {
        currentTimecode = socketData.timecode;
        onTimecodeUpdate(socketData);
    }

    if (currentTally !== socketData.tallyState){
        onTallyUpdate(socketData.tallyState);
        currentTally = socketData.tallyState;
    }
    previousClip = socketData;
};

module.exports = { updateStatus };