const ClickData = require('../models/clickDataModel');

exports.saveClickData = async (data, req) => {
  try {
    const clickData = new ClickData({
      eventName: data.eventName,
      DateTime: data.currentDateTime,
      tag: data.tag,
      text: data.text,
      id: data.id,
      ip: data.ipAddress,
      class: data.class,
      headers: data.headers,
      localStorageData: data.localStorageData,
      SessionStorage: data.sessionStorageData,
    });
    const savedData = await clickData.save();
    console.log('Data saved to MongoDB:', savedData);
  } catch (error) {
    console.error('Failed to insert data into MongoDB:', error);
  }
};

