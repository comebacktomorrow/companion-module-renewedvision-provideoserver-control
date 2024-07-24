const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')

const { throttle, fetchAndUpdateResponse, simpleTime, jsonTimecodeToString, timecodeToTotalFrames, calcTimeRemainingAsString } = require('./src/utils') // Import the fetchAndUpdateResponse function
const { fetchPlaylistData, findClipByClipName } = require('./src/playlist');
const { setupWebSocket } = require('./src/websocket');
const { updateStatus } = require('./src/coreLogic');

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal);
		this.variables = {};
		this.selectedClipData = null;
		this.playlistData ={};
		this.playbackState = 'Unknown';
		this.currentTimecode = '00:00:00:00'
		this.selectedClipIndex = -1;
		this.isInitalised = false;

		this.throttledSetVariableValues = throttle(this.setTimecodeVariables, 500, this);

	}

	async init(config) {
		
		this.config = config;
		this.updateHandlers = this.setupUpdateHanlders();
		this.initWebSocket(this.updateHandlers)
		this.isInitalised = true;

		this.updateActions(); // export actions
		this.updateFeedbacks(); // export feedbacks
		this.updateVariableDefinitions(); // export variable definitions

	}

	// When module gets deleted
	async destroy() {
		this.isInitalised = false;
		this.log('debug', 'destroy');
		if (this.ws) {
			this.ws.close()
			delete this.ws
		}
	}

	maybeReconnect() {
		console.log('maybe reconnect')
		if (this.isInitalised) {
			if (this.reconnect_timer) {
				clearTimeout(this.reconnect_timer)
			}
			this.reconnect_timer = setTimeout(() => {
				console.log('attempting to reconnect for real')
				this.initWebSocket(this.updateHandlers);
			}, 5000)
		}
	}

	validateConfig() {
		const { host, port } = this.config;
		if (!host || !port) {
			this.log('warn', 'Invalid host or port in config');
			InstanceStatus.Disconnected;
			return false;
		}
		this.updateStatus(InstanceStatus.Connecting);
		return true;
	}

	async configUpdated(config) {
		this.config = config;
		//maybe add the hanlder back in?
		this.initWebSocket(this.updateHandlers);
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
				default: 10,
				regex: Regex.PORT,
			},
			{
				type: 'textinput',
				id: 'clipNameLength',
				label: 'Truncate clip names longer than',
				type: 'number',
				default: 12,
				min:1,
			},
		]
	}

	async fetchAndSetPlaylistVariables() {
		try {
			const playlist = await fetchPlaylistData(this.config.host, this.config.port);
			this.setupClipVariables(playlist);
			this.playlistData = playlist;
			console.log('got playlist')
			return playlist;
		} catch (error) {
			this.log('error', `Failed to fetch playlist data: ${error.message}`);
			throw error;
		}
	}

	setupClipVariables(playlist) {
		const playlistSize = this.config.playlistSize || playlist.length;
		for (let i = 0; i < playlistSize; i++) {
			const clip = playlist[i] || { cleanName: '', duration: '' };
			this.setVariable(`clip_name_${i}`, this.truncateString(clip.cleanName, this.config.clipNameLength));
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

	setTimecodeVariables(data) {
		const frameRate = Math.round(this.selectedClipData.fps * 100) / 100;
		
		const t1 = timecodeToTotalFrames(this.selectedClipData.t1) === 0 ? '00:00:00:00' : calcTimeRemainingAsString(data.timecode, this.selectedClipData.t1, frameRate, false).result.toString();
		const t2 = timecodeToTotalFrames(this.selectedClipData.t2) === 0 ? '00:00:00:00' : calcTimeRemainingAsString(data.timecode, this.selectedClipData.t2, frameRate, false).result.toString();
		const trt = timecodeToTotalFrames(this.selectedClipData.trt) === timecodeToTotalFrames(this.selectedClipData.duration) ? '00:00:00:00' : calcTimeRemainingAsString(data.timecode, this.selectedClipData.trt, frameRate, false).result.toString();
		const remain = calcTimeRemainingAsString(data.timecode, this.selectedClipData.duration, frameRate).result.toString();

		//console.log("t1 " + t1 + " t2 " + t2 + " trt " + trt + " remain " + remain)
		//console.log("t1 " + JSON.stringify(t1) + " t2 " + t2 + " trt " + trt + " remain " + remain)
		this.currentTimecode =  data.timecode;
		this.setVariableValues({ 
			current_timecode: simpleTime(jsonTimecodeToString(data.timecode)),
			timer_t1: simpleTime(t1),
			timer_t2: simpleTime(t2),
			timer_trt: simpleTime(trt),
			timer_remain: simpleTime(remain)
		});
	}

	truncateString(str, num) {
		return str.length > num ? `${str.slice(0, num)}` : str;
	}

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}

	async initWebSocket(updateHandler){
		this.updateStatus(InstanceStatus.Connecting)
		if (this.ws) {
			this.ws.close(1000)
			delete this.ws
		}

		console.log('Calling initWebSocket', updateHandler);

		if (!updateHandler) {
            console.error('Update handlers are undefined.');
            this.updateStatus(InstanceStatus.ConnectionFailure);
            return;
        }

		if (Object.keys(this.playlistData).length === 0){
			await this.fetchAndSetPlaylistVariables();
		}
		//this.fetchAndSetPlaylistVariables();
		console.log('passing off to websocket')
		this.ws = setupWebSocket(updateHandler, this);

	}

	connectionOk(){
		this.updateStatus(InstanceStatus.Ok);
	}

	connectionDisconnect(){
		this.updateStatus(InstanceStatus.Disconnected);
	}

	setupUpdateHanlders() {
		const updateHandlers = {
			onLibraryUpdate: async (data) => {
				console.log('got library update');
				console.log(data);
				await this.fetchAndSetPlaylistVariables();
				this.selectedClipData = findClipByClipName(data.clipName);
				if (this.selectedClipData) {
					// Process additional data if needed
					let truncateName = this.truncateString(this.selectedClipData.cleanName, this.config.clipNameLength)
					console.log('we should truncate names longer than ' + this.config.clipNameLength);
					this.setVariableValues({ 
						current_clip_name: truncateName, 
						current_clip_duration: simpleTime(jsonTimecodeToString(this.selectedClipData.duration)),
						playback_behavior: this.selectedClipData.playbackBehavior,
						current_clip_id: this.selectedClipData.index,
						//we could do selected clip feedback in here
					});
					this.checkFeedbacks('clipExists'); 
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
				//this block does nothing since onClipChange implies we'll need to do findClipByName anyway
				// if (!this.selectedClipData){
				// 	this.selectedClipData = findClipByClipName(data.clipName);
				// 	console.log('ClipChange - ive got ' + this.selectedClipData);
				// }
				//await fetchPlaylistData();
				// we don't have to 
				// we should move to UUID - we don't have to get playlist for every update
				// but unless we can accurately track isActive, things will get weird.
				console.log(this.selectedClipData);
				this.selectedClipData = findClipByClipName(data.clipName);
				console.log('main set index as ' + this.selectedClipIndex); //this gives us the old value
				if (this.selectedClipData) {
					let truncateName = this.truncateString(this.selectedClipData.cleanName, this.config.clipNameLength)
					this.setVariableValues({ 
						current_clip_name: truncateName, 
						current_clip_duration: simpleTime(jsonTimecodeToString(this.selectedClipData.duration)),
						curent_playback_behavior: this.selectedClipData.playbackBehavior,
						curent_clip_id: this.selectedClipData.index,
					});
					this.selectedClipIndex = this.selectedClipData.index; // Set the selected clip index //new
					this.checkFeedbacks('clipIsSelected'); // new
					this.throttledSetVariableValues(data); // we also need to update timers
        		}
    		},
            onTimecodeUpdate: (data) => {
				//console.log('got tc change');
				if (this.selectedClipData != null){
				this.throttledSetVariableValues(data);
				} else {
					console.log('no timecode data yet')
				}
			},
            onTallyUpdate: (data) => {
				//console.log('got tally change');
        		this.setVariableValues({ tally_state: data });
            },
		}
		return updateHandlers;
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)