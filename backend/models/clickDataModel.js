const mongoose = require('mongoose');

const clickDataSchema = new mongoose.Schema({
  eventName:String,
  DateTime:String,
  tag: String,
  text: String,
  id: String,
  ip: String,
  class: String,
  headers: Object,
  localStorageData: Object,
  SessionStorage:Object,
});


const ClickData = mongoose.model('ClickData', clickDataSchema);

module.exports = ClickData;