const { combineRgb } = require('@companion-module/base')

module.exports = async function (self) {
	self.setFeedbackDefinitions({
		clipExists: {
			type: 'boolean',
			name: 'Clip Exists',
			description: 'If a clip exists at a given index',
			defaultStyle: {
				color: combineRgb(0, 0, 255),
				bgcolor: combineRgb(0, 0, 0)
			},
			options: [
				{
					type: 'number',
					label: 'Clip Index',
					id: 'clipIndex',
					default: 0,
					min: 0
				}
			],
			callback: (feedback) => {
				const clipIndex = feedback.options.clipIndex;
				if (clipIndex >= 0 && clipIndex < self.playlistData.length){
					return true;
				}
				return false;
			}
		},
	
		clipIsSelected: {
		type: 'boolean',
		name: 'Clip is Selected',
		description: 'If a clip is selected at a given index',
		defaultStyle: {
			color: combineRgb(255, 165, 0),
			bgcolor:combineRgb(0, 0, 0)
		},
		options: [
			{
				type: 'number',
				label: 'Clip Index',
				id: 'clipIndex',
				default: 0,
				min: 0
			}
		],
		callback: (feedback) => {
			const selectedClip = self.getVariableValue(self.selectedClipIndex);
			const targetClipIndex = feedback.options.clipIndex;
			const activeClipIndex = self.selectedClipIndex;
			if (targetClipIndex === activeClipIndex){
				console.log('selected clip is '+ targetClipIndex);
				return true;
			}
			return false
		}
		},
		playbackState: {
			name: 'Playback State',
			description: 'Reflects the current playback state',
			type: "boolean",
			label: "Playback State",
			description: "Indicates the playback state of PVS",
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			  },
			options: [
				{
					type: 'dropdown',
					label: 'State',
					id: 'state',
					default: 'playing',
					choices: [
						{ id: 'Playing', label: 'Playing' },
						{ id: 'Paused', label: 'Paused' },
						{ id: 'Stopped', label: 'Stopped' },
						{ id: 'Unknown State', label: 'Unknown' },
					],
				},
			],
			callback: (feedback, instance) => {
				
				console.log("feedback getting state");
				const myState = self.getVariableValue(self.playbackState);
				console.log("feedback state as " + feedback.options.state + " vs " + self.playbackState);
				return self.playbackState == feedback.options.state;
			},
		},
	})
}
