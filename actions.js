const { stringToJsonTimecode, jsonTimecodeToString } = require('./src/utils')

const { 
    handlePlay, 
    handlePause, 
	handleToggle,
    handleStop, 
    handleLoadClipByIndex, 
    jumpToTime, 
    jumpToEnd, 
    requeueCurrentClip, 
    queuePreviousClip, 
    queueNextClip, 
    loadClipByName,
    updateClipTimersById
} = require('./src/actionHandlers');

module.exports = function (self)  {
    self.setActionDefinitions({

        // Basic playback actions
        play: {
            name: 'Play',
            options: [],
            callback: async () => {
                try {
                    await handlePlay(self);
                } catch (error) {
                    self.log('error', error.message);
                }
            },
        },
		toggle: {
			name: 'Toggle Play/Pause',
			options: [],
			callback: async () => {
			  await handleToggle(self);
			},
		},
        pause: {
            name: 'Pause',
            options: [],
            callback: async () => {
                try {
                    await handlePause(self);
                } catch (error) {
                    self.log('error', error.message);
                }
            },
        },
        stop: {
            name: 'Stop',
            options: [],
            callback: async () => {
                try {
                    await handleStop(self);
                } catch (error) {
                    self.log('error', error.message);
                }
            },
        },
        loadClipByIndex: {
            name: 'Load Clip by Index',
            options: [
                {
                    type: 'number',
                    label: 'Clip Index',
                    id: 'index',
                    default: 0,
                    min: 0,
                    max: 9999,
                },
            ],
            callback: async (action) => {
                const index = action.options.index;
                try {
                    await handleLoadClipByIndex(self, index);
                } catch (error) {
                    self.log('error', error.message);
                }
            },
        },
        // Advanced playback actions
        jumpToTime: {
            name: 'Jump to Time',
            options: [
                {
                    type: 'textinput',
                    label: 'Time (seconds)',
                    id: 'time',
                    default: '0',
                },
            ],
            callback: async (action) => {
                const time = action.options.time;
                try {
                    const message = await jumpToTime(self, time);
                    self.log('info', message);
                } catch (error) {
                    self.log('error', error.message);
                }
            },
        },
        jumpToEnd: {
            name: 'Jump to End',
            options: [
                {
                    type: 'textinput',
                    label: 'Time (seconds from end)',
                    id: 'time',
                    default: '0',
                },
            ],
            callback: async (action) => {
                const time = action.options.time;
                try {
                    const message = await jumpToEnd(self, time);
                    self.log('info', message);
                } catch (error) {
                    self.log('error', error.message);
                }
            },
        },
        requeueCurrentClip: {
            name: 'Requeue Current Clip',
            options: [],
            callback: async () => {
                try {
                    const message = await requeueCurrentClip(self);
                    self.log('info', message);
                } catch (error) {
                    self.log('error', error.message);
                }
            },
        },
        queuePreviousClip: {
            name: 'Queue Previous Clip',
            options: [],
            callback: async () => {
                try {
                    const message = await queuePreviousClip(self);
                    self.log('info', message);
                } catch (error) {
                    self.log('error', error.message);
                }
            },
        },
        queueNextClip: {
            name: 'Queue Next Clip',
            options: [],
            callback: async () => {
                try {
                    const message = await queueNextClip(self);
                    self.log('info', message);
                } catch (error) {
                    self.log('error', error.message);
                }
            },
        },
        loadClipByName: {
            name: 'Load Clip by Name',
            options: [
                {
                    type: 'textinput',
                    label: 'Clip Name',
                    id: 'clipName',
                    default: '',
                },
            ],
            callback: async (action) => {
                const clipName = action.options.clipName;
                try {
                    const message = await loadClipByName(self, clipName);
                    self.log('info', message);
                } catch (error) {
                    self.log('error', error.message);
                }
            },
        },
        updateClipTimersById: {
            name: 'Update Clip Timers by ID',
            options: [
                {
                    type: 'number',
                    label: 'Clip ID',
                    id: 'clipId',
                    default: 0,
                    useVariables: true,
                    min: -1,
                },
                {
                    type: 'dropdown',
                    label: 'Timer',
                    id: 'timer',
                    default: 't1',
                    choices: [
                        { id: 't1', label: 'Timer T1' },
                        { id: 't2', label: 'Timer T2' },
                        { id: 'trt', label: 'Timer TRT' },
                    ],
                },
                {
                    type: 'textinput',
                    label: 'Timecode',
                    id: 'timecode',
                    default: '',
                    useVariables: true,
                    description: 'Timecode should be in hh:mm:ss:ff format. Blank will set to the current timecode'
                }
            ],
            callback: async (action, context) => {
                let clipId = action.options.clipId;
                const timer = action.options.timer;
                let timecode = await context.parseVariablesInString(action.options.timecode);

                if(clipId == -1){
                    clipId = self.selectedClipIndex;
                    console.log('change clip index to ' + clipId)
                }

                console.log('clip id is ' + clipId)

                if (timecode == ''){
                    timecode = jsonTimecodeToString(self.currentTimecode);
                    console.log('timecode is blank - set timer to current timecode');
                }
                console.log('setting timer ' + timer + " for clip " + clipId + " at " + timecode);
                try {
                    await updateClipTimersById(self, clipId, timer, timecode);
                } catch (error) {
                    console.error('Update Clip Timers by ID command failed:', error);
                }
            }
        },



    } )
}
