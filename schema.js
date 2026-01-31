const Joi= require('joi');
// const { listeners } = require('./models/skill.js');

module.exports.skillSchema= Joi.object({
skill: Joi.object({
  username:Joi.string().required(),
  skillsOffered:Joi.string().required(),
  skillsWanted:Joi.string().required(),
  availability:Joi.string().required(),
  profilePhoto: Joi.string().allow("",null)
  }).required()
});

module.exports.reviewSchema = Joi.object({
  review:Joi.object({
    rating:Joi.number().required(),
    comment: Joi.string().required()
  }).required()
});

//schema validation for server side we did client side schema validation by adding required and error in form