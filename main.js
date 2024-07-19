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
		this.config = config
		console.log('initing')
		this.updateStatus(InstanceStatus.Ok);
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		await this.updatePlaylistVariables();
		// Validate config and attempt connection
		//this.validateConfig()

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
	}

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
		const { host, port } = this.config
		if (!host || !Regex.IP.test(host) || !port || !Regex.PORT.test(port)) {
			this.updateStatus(InstanceStatus.Error, 'Invalid IP address or port')
			this.log('error', 'Invalid IP address or port')
			return
		}

		this.updateStatus(InstanceStatus.Ok)
		this.log('info', `Connecting to ProVideoServer at ${host}:${port}`)
		
		// Example fetch call to test connection
		const url = `http://${host}:${port}/API/PVS/status`
		// fetchAndUpdateResponse(url, 'GET')
		// 	.then(response => {
		// 		if (response.status === 'OK') {
		// 			this.updateStatus(InstanceStatus.Ok)
		// 		} else {
		// 			this.updateStatus(InstanceStatus.Error, 'Failed to connect')
		// 		}
		// 	})
		// 	.catch(error => {
		// 		this.updateStatus(InstanceStatus.Error, 'Connection error')
		// 		this.log('error', 'Connection error: ' + error.message)
		// 	})
	}

	// this should probably be superceeded by fetchAndSetPlaylistVars below
	async updatePlaylistVariables() {
		try {
			console.log("IP " + this.config.host + " PORT "  + this.config.port)
			const playlist = await fetchPlaylistData(this.config.host, this.config.port);
			//this.setupClipVariables(playlist);
		} catch (error) {
			this.log('error', `Failed to fetch playlist data: ${error.message}`);
		}
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

	setupClipVariables(playlist) {
		const playlistSize = this.config.playlistSize || playlist.length;
		for (let i = 0; i < playlistSize; i++) {
			const clip = playlist[i] || { name: '', duration: '' };
			this.setVariable(`clip_name_${i}`, clip.name);
			this.setVariable(`clip_duration_${i}`, clip.duration);
		}
	}

	setVariable(name, value) {
		this.variables[name] = value;
		this.updateVariableDefinitions();
	}


	// setupClipVariables(playlist) {
	// 	playlist.forEach((clip, index) => {
	// 		this.setVariable(`clip_name_${index}`, clip.name);
	// 		this.setVariable(`clip_duration_${index}`, clip.duration);
	// 	});
	// }

	// setVariable(name, value) {
	// 	this.variables[name] = value;
	// 	this.updateVariableDefinitions();
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