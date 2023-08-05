const mongoose = require("mongoose");
const { Schema } = mongoose;

const collaboratorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
});

const EventSchema = new Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  id: {
    type: String,
  },
  title: {
    type: String,
  },
  start: {
    type: Date,
  },
  end: {
    type: Date,
  },
  allDay: {
    type: Boolean
  },
  collaborators: [collaboratorSchema],
  
});
module.exports = mongoose.model("Event", EventSchema);
