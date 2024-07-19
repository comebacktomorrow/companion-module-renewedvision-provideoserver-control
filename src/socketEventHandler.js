function handleWebSocketMessage(socketData, instance) {
    const {
        onLibraryUpdate,
        onStateChange,
        onClipChange,
        onTimecodeUpdate,
        onTallyUpdate,
    } = instance.updateHandlers;

    if (instance.currentLibraryTimeStamp !== socketData.libraryTimestamp) {
        instance.currentLibraryTimeStamp = socketData.libraryTimestamp;
        onLibraryUpdate(socketData);
    }

    if (socketData.state !== instance.previousClip.state) {
        onStateChange(socketData);
    }

    if (socketData.clipName !== instance.previousClip.clipName) {
        onClipChange(socketData);
    }

    if (instance.currentTimecode !== socketData.timecode) {
        onTimecodeUpdate(socketData);
    }

    onTallyUpdate(socketData.tallyState);
    instance.previousClip = socketData;
}

module.exports = {
    handleWebSocketMessage,
};