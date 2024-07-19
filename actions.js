const { handlePlay, handlePause, handleToggle, handleStop } = require('./src/actionHandlers');

module.exports = function (self) {
	self.setActionDefinitions({
		play: {
		  name: 'Play',
		  options: [],
		  callback: async () => {
			console.log('play please');
			await handlePlay(self);
		  },
		},
		pause: {
		  name: 'Pause',
		  options: [],
		  callback: async () => {
			await handlePause(self);
		  },
		},
		toggle: {
		  name: 'Toggle Play/Pause',
		  options: [],
		  callback: async () => {
			await handleToggle(self);
		  },
		},
		stop: {
		  name: 'Stop',
		  options: [],
		  callback: async () => {
			await handleStop(self);
		  },
		},
	  });
}
