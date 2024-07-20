const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')

const { fetchAndUpdateResponse, simpleTime, jsonTimecodeToString, timecodeToTotalFrames, calcTimeRemainingAsString } = require('./src/utils') // Import the fetchAndUpdateResponse function
const { fetchPlaylistData, findClipByClipName } = require('./src/playlist');
const { setupWebSocket } = require('./src/websocket');
const { updateStatus } = require('./src/coreLogic');

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal);
		this.variables = {};
		this.selectedClipData = {};
		this.playlistData ={};
		this.playbackState = 'Unknown';
		this.currentTimecode = '00:00:00:00'
		this.selectedClipIndex = -1;
	}

	async init(config) {
		this.updateStatus(InstanceStatus.Disconnected);
		this.updateStatus(InstanceStatus.Connecting);
		this.config = config
		console.log('initing')
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		
		this.validateConfig();

		// Validate config and attempt connection
		if (InstanceStatus.Connecting) {
			// Fetch playlist data and update variables if the config is valid
			try {
				console.log('instance ok');
				await this.fetchAndSetPlaylistVariables();
				this.updateStatus(InstanceStatus.Ok)
			} catch (error) {
				console.error('Error updating playlist variables:', error);
				this.updateStatus(InstanceStatus.Error);
			}
		} else {
			console.warn('Invalid config. Skipping playlist update.');
		}

		if (InstanceStatus.Ok){
			
		// Initialize WebSocket
        const updateHandlers = {
            onLibraryUpdate: async (data) => {
				console.log('got library update');
				await this.fetchAndSetPlaylistVariables();
				this.selectedClipData = findClipByClipName(data.clipName);
				if (this.selectedClipData) {
					// Process additional data if needed
					this.setVariableValues({ 
						current_clip_name: this.selectedClipData.cleanName, 
						current_clip_duration: simpleTime(jsonTimecodeToString(this.selectedClipData.duration)),
						playback_behavior: this.selectedClipData.playbackBehavior,
						current_clip_id: this.selectedClipData.index,
						//we could do selected clip feedback in here
					});
				}
            },
            onStateChange: (data) => {
				console.log('got state change');
				const stateTextMapping = {
					'AT_START': 'Standby',
					'AT_END': 'Stopped',
					'PLAYING': 'Playing',
					'PAUSED': 'Paused',
					'CUEING': 'Seeking',
				};
				const stateText = stateTextMapping[data.state] || 'Unknown State';
				this.setVariableValues({ current_playback_state: stateText });
				this.playbackState = stateText; //new
				this.checkFeedbacks('playbackState'); //new
			},
            onClipChange: async (data) => {
				console.log('got clip change');
				//await fetchPlaylistData();
				// we don't have to 
				// we should move to UUID - we don't have to get playlist for every update
				// but unless we can accurately track isActive, things will get weird.
				
				this.selectedClipData = findClipByClipName(data.clipName);
				console.log('main set index as ' + this.selectedClipIndex)
				if (this.selectedClipData) {
					this.setVariableValues({ 
						current_clip_name: this.selectedClipData.cleanName, 
						current_clip_duration: simpleTime(jsonTimecodeToString(this.selectedClipData.duration)),
						curent_playback_behavior: this.selectedClipData.playbackBehavior,
						curent_clip_id: this.selectedClipData.index,
					});
					this.selectedClipIndex = this.selectedClipData.index; // Set the selected clip index //new
					this.checkFeedbacks('clipIsSelected'); // new
        		}
    		},
            onTimecodeUpdate: (data) => {
				console.log('got tc change');
				const frameRate = Math.round(this.selectedClipData.fps * 100) / 100;
		
				const t1 = timecodeToTotalFrames(this.selectedClipData.t1) === 0 ? '00:00:00:00' : calcTimeRemainingAsString(data.timecode, this.selectedClipData.t1, frameRate, false).result.toString();
				const t2 = timecodeToTotalFrames(this.selectedClipData.t2) === 0 ? '00:00:00:00' : calcTimeRemainingAsString(data.timecode, this.selectedClipData.t2, frameRate, false).result.toString();
				const trt = timecodeToTotalFrames(this.selectedClipData.trt) === timecodeToTotalFrames(this.selectedClipData.duration) ? '00:00:00:00' : calcTimeRemainingAsString(data.timecode, this.selectedClipData.trt, frameRate, false).result.toString();
				const remain = calcTimeRemainingAsString(data.timecode, this.selectedClipData.duration, frameRate).result.toString();
		
				console.log("t1 " + t1 + " t2 " + t2 + " trt " + trt + " remain " + remain)
				console.log("t1 " + JSON.stringify(t1) + " t2 " + t2 + " trt " + trt + " remain " + remain)
				this.currentTimecode =  data.timecode;
				this.setVariableValues({ 
					current_timecode: simpleTime(jsonTimecodeToString(data.timecode)),
					timer_t1: simpleTime(t1),
					timer_t2: simpleTime(t2),
					timer_trt: simpleTime(trt),
					timer_remain: simpleTime(remain)
				});
			},
            onTallyUpdate: (data) => {
				console.log('got tally change');
        		this.setVariableValues({ tally_state: data });
            },
        };

        setupWebSocket(updateHandlers, this);
	}}

	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
	}

	async configUpdated(config) {
		this.config = config

		//maybe this?
		// if (this.config.host !== config.host || this.config.port !== config.port) {
		// 	this.init(config);
		// }
	}

	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'PVS Control App IP',
				width: 8,
				regex: Regex.IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'PVS Control App Port',
				width: 4,
				regex: Regex.PORT,
			},
			{
				type: 'textinput',
				id: 'playlistSize',
				label: 'Number of clips to be displayed variables',
				width: 4,
				regex: Regex.PORT,
			},
			{
				type: 'checkbox',
				id: 'showFrames',
				label: 'Show frames on times',
				default: true
			},
		]
	}

	validateConfig() {
		const { host, port } = this.config;
		if (!host || !port) {
			this.log('warn', 'Invalid host or port in config');
			this.updateStatus(InstanceStatus.BadConfig);
			return false;
		}
		this.updateStatus(InstanceStatus.Connecting);
		return true;
	}

	async fetchAndSetPlaylistVariables() {
		try {
			const playlist = await fetchPlaylistData(this.config.host, this.config.port);
			this.setupClipVariables(playlist);
			this.playlistData = playlist;
			return playlist;
		} catch (error) {
			this.log('error', `Failed to fetch playlist data: ${error.message}`);
		}
	}

	setupClipVariables(playlist) {
		const playlistSize = this.config.playlistSize || playlist.length;
		for (let i = 0; i < playlistSize; i++) {
			const clip = playlist[i] || { cleanName: '', duration: '' };
			this.setVariable(`clip_name_${i}`, clip.cleanName);
			this.setVariable(`clip_duration_${i}`, simpleTime(jsonTimecodeToString(clip.duration)));
		}
	}

	setVariable(variableId, value) {
		this.setVariableValues({ [variableId]: value });
	}

	// Method to check if a clip exists at a given index
	isClipExists(index) {
		return index >= 0 && index < this.playlistData.length;
	}

	// // Method to check if a clip is selected at a given index
	// isClipSelected(index) {
	// 	console.log('called is isClipSelected');
	// 	return index === this.selectedClipIndex;
	// }

	// updateVariableDefinitions() {
	// 	const variableDefinitions = Object.keys(this.variables).map((key) => ({
	// 		name: key,
	// 		label: key,
	// 	}));

	// 	this.setVariableDefinitions(variableDefinitions);

	// 	for (const [name, value] of Object.entries(this.variables)) {
	// 		this.setVariableValue(name, value);
	// 	}
	// }

    // getPlaybackState() {
	// 	console.log('getPlaybackState');
    //     return this.playbackState;
    // }


	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)