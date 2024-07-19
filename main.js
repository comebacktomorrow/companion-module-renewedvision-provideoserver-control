const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')
//const { fetchAndUpdateResponse } = require('./src/utils') // Import the fetchAndUpdateResponse function
const { fetchPlaylistData } = require('./src/playlist');

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		this.config = config

		this.updateStatus(InstanceStatus.Ok)

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		await this.updatePlaylistVariables();
		// Validate config and attempt connection
		//this.validateConfig()
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

	async updatePlaylistVariables() {
		try {
			console.log("IP " + this.config.host + " PORT "  + this.config.port)
			const playlist = await fetchPlaylistData(this.config.host, this.config.port);
			//this.setupClipVariables(playlist);
		} catch (error) {
			this.log('error', `Failed to fetch playlist data: ${error.message}`);
		}
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