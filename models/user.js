// const { types, string } = require('joi');
const mongoose = require('mongoose');
const  Passport  = require('passport');
const PassportLocalMongoose = require('passport-local-mongoose');
const Schema = mongoose.Schema;
const Skill = require('./skill');

const userSchema = new mongoose.Schema({
  email:{
    type:String,
    required:true,
    unique:true,
  },
  skills:[{
  type:mongoose.Schema.Types.ObjectId,
  ref:'Skill',
  }],
});

userSchema.plugin(PassportLocalMongoose) //implemet hashing salting

const User = mongoose.model("User",userSchema);

module.exports = User;