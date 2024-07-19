const WebSocket = require('ws');
const { updateStatus } = require('./coreLogic');

const setupWebSocket = (updateHandlers, instance) => {
    const url = `ws://${instance.config.host}:${instance.config.port}`;
    const socket = new WebSocket(url);

    socket.on('open', () => {
        console.log('WebSocket connection established.');
    });

    socket.on('message', (event) => {
        const socketData = JSON.parse(event);
        updateStatus(socketData, updateHandlers);
    });

    socket.on('close', () => {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        setTimeout(() => setupWebSocket(updateHandlers, instance), 1000);
    });

    socket.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
};

module.exports = { setupWebSocket };