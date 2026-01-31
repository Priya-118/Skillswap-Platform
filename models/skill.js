const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./user');
const { required } = require('joi');

const skillSchema = new mongoose.Schema({
  username: String,
  location: String,
  profilePhoto: {
  type: String,
  default: "",
  },
  skillsOffered: [{
    type: [String],
    default: []
  }],
  skillsWanted: [{
    type: [String],
    default: []
  }],
  availability: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  review: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
    }
  ]
});



const Skill = mongoose.model('Skill',skillSchema);

module.exports = Skill;
