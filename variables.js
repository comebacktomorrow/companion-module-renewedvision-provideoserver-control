const { fetchPlaylistData } = require('./src/playlist');
const { jsonTimecodeToString, simpleTime } = require('./src/utils');

module.exports = async function (self) {
    const playlistSize = self.config.playlistSize || 10; // Default to 10 if not set

    const variableDefinitions = [
        { variableId: 'current_clip_name', name: 'Current Clip Name' },
        { variableId: 'current_clip_duration', name: 'Current Clip Duration' },
        { variableId: 'current_playback_state', name: 'Current Playback State' },
        { variableId: 'current_timecode', name: 'Current Timecode' },
        { variableId: 'timer_t1', name: 'Timer T1' },
        { variableId: 'timer_t2', name: 'Timer T2' },
        { variableId: 'timer_trt', name: 'Timer TRT' },
        { variableId: 'timer_remain', name: 'Timer Remaining' },
        { variableId: 'tally_state', name: 'Tally State' },
    ];

    for (let i = 0; i < playlistSize; i++) {
        variableDefinitions.push(
            { variableId: `clip_name_${i}`, name: `Clip Name ${i + 1}` },
            { variableId: `clip_duration_${i}`, name: `Clip Duration ${i + 1}` }
        );
    }

    self.setVariableDefinitions(variableDefinitions);

    // Initialize variables with empty values
    const initialVariables = {};
    for (let i = 0; i < playlistSize; i++) {
        initialVariables[`clip_name_${i}`] = '';
        initialVariables[`clip_duration_${i}`] = '';
    }
    self.setVariableValues(initialVariables);
};