const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')

const { fetchAndUpdateResponse, simpleTime, jsonTimecodeToString, timecodeToTotalFrames, calcTimeRemainingAsString } = require('./src/utils') // Import the fetchAndUpdateResponse function
const { fetchPlaylistData, findClipByClipName } = require('./src/playlist');
const { setupWebSocket } = require('./src/websocket');
const { updateStatus } = require('./src/coreLogic');

let selectedClipData = {};
let playlistData ={};

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal);
		this.variables = {};
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
				await this.updatePlaylistVariables();
				this.updateStatus(InstanceStatus.Ok)
			} catch (error) {
				console.error('Error updating playlist variables:', error);
				this.updateStatus(InstanceStatus.Error);
			}
		} else {
			console.warn('Invalid config. Skipping playlist update.');
		}

		if (InstanceStatus.Ok){
			//await this.updatePlaylistVariables();
			
		// Initialize WebSocket
        const updateHandlers = {
            onLibraryUpdate: async (data) => {
				console.log('got library update');
				playlistData = await this.fetchAndSetPlaylistVariables();
				selectedClipData = findClipByClipName(data.clipName);
				if (selectedClipData) {
					// Process additional data if needed
					this.setVariableValues({ 
						current_clip_name: selectedClipData.cleanName, 
						current_clip_duration: simpleTime(jsonTimecodeToString(selectedClipData.duration)),
						playback_behavior: selectedClipData.playbackBehavior,
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
			},
            onClipChange: async (data) => {
				console.log('got clip change');
				//await fetchPlaylistData();
				// we don't have to 
				// we should move to UUID - we don't have to get playlist for every update
				// but unless we can accurately track isActive, things will get weird.
				
				selectedClipData = findClipByClipName(data.clipName);
				if (selectedClipData) {
					this.setVariableValues({ 
						current_clip_name: selectedClipData.cleanName, 
						current_clip_duration: simpleTime(jsonTimecodeToString(selectedClipData.duration)),
						curent_playback_behavior: selectedClipData.playbackBehavior,
					});
        		}
    		},
            onTimecodeUpdate: (data) => {
				console.log('got tc change');
				const frameRate = Math.round(selectedClipData.fps * 100) / 100;
		
				const t1 = timecodeToTotalFrames(selectedClipData.t1) === 0 ? '00:00:00:00' : calcTimeRemainingAsString(data.timecode, selectedClipData.t1, frameRate, false).result.toString();
				const t2 = timecodeToTotalFrames(selectedClipData.t2) === 0 ? '00:00:00:00' : calcTimeRemainingAsString(data.timecode, selectedClipData.t2, frameRate, false).result.toString();
				const trt = timecodeToTotalFrames(selectedClipData.trt) === timecodeToTotalFrames(selectedClipData.duration) ? '00:00:00:00' : calcTimeRemainingAsString(data.timecode, selectedClipData.trt, frameRate, false).result.toString();
				const remain = calcTimeRemainingAsString(data.timecode, selectedClipData.duration, frameRate).result.toString();
		
				console.log("t1 " + t1 + " t2 " + t2 + " trt " + trt + " remain " + remain)
				console.log("t1 " + JSON.stringify(t1) + " t2 " + t2 + " trt " + trt + " remain " + remain)

				this.setVariableValues({ 
					current_timecode: jsonTimecodeToString(data.timecode),
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
		// Re-validate config and attempt connection
		//this.validateConfig()
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
			return playlist;
		} catch (error) {
			this.log('error', `Failed to fetch playlist data: ${error.message}`);
		}
	}

	async updatePlaylistVariables() {
		try {
			const playlist = await this.fetchAndSetPlaylistVariables();
			if (playlist) {
				this.setupClipVariables(playlist);
			}
		} catch (error) {
			this.log('error', `Failed to update playlist variables: ${error.message}`);
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