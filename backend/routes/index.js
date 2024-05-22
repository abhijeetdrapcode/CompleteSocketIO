const express = require('express');
const clickDataController = require('../controllers/clickDataController');
const router = express.Router();

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('clickData', async (data) => {
      try {
        console.log('Received click data:', data);
        const req = socket.request;
        const savedData = await clickDataController.saveClickData(data, req);
        socket.emit('clickDataSaved', { message: 'Click data saved successfully', data: savedData });
      } catch (err) {
        console.error('Error saving click data:', err);
        socket.emit('clickDataError', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });
  });

  return router;
};