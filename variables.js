const { fetchPlaylistData } = require('./src/playlist');
const { jsonTimecodeToString, simpleTime } = require('./src/utils') 

module.exports = async function (self) {
    try {
        const playlistSize = self.config.playlistSize || 10; // Default to 10 if not set
        const playlist = await fetchPlaylistData(self.config.host, self.config.port);

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

        // Initialize variables with playlist data or empty values
        for (let i = 0; i < playlistSize; i++) {
            const clip = playlist[i];
            self.setVariableValues({
                [`clip_name_${i}`]: clip ? clip.cleanName : '',
                [`clip_duration_${i}`]: clip ? simpleTime(jsonTimecodeToString(clip.duration)) : '',
            });
        }
    } catch (error) {
        console.error('Error fetching playlist data:', error);
    }
};