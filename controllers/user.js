const User = require('../models/user.js');
const Skill =require('../models/skill.js');
const passport = require("passport");

//GET:sign up
module.exports.signup =  (req, res) => {
  res.render("signin");
};

//POST:sign up
module.exports.signupPost = async (req, res, next) => {
  try {
    let { username, email, password } = req.body;
    let newUser = new User({ email, username });

    const RegisterUser = await User.register(newUser, password);
    await newUser.save();
    console.log(RegisterUser);

    req.login(RegisterUser, (err) => {
      if (err) return next(err); 
      req.flash("success", "Welcome to SkillSwap");
      res.redirect(`/user/${RegisterUser._id}/detailuser`);
    });
  } catch (e) {
    req.flash("error", `${e.message}`);
    res.redirect("/signin");
  }
};

module.exports.login =  (req, res) => {
  res.render("login");
};

module.exports.loginPost = async(req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash("error", "Invalid username or password");
      return res.redirect("/login");
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      req.flash("success", "Welcome back!");
      return res.redirect("/users");
    });
  })(req, res, next);
};

module.exports.logOut=(req, res, next) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "you are logged out");
    res.redirect("/");
  });
};

module.exports.userDash = (req, res) => {
  res.render("userDash");
};

module.exports.userDashPost = async(req, res) => {
  try {
    let {
      username,
      location,
      profilePhoto,
      skillsOffered,
      skillsWanted,
      availability,
    } = req.body;

    const newSkill = new Skill({
      username,
      location,
      profilePhoto,
      skillsOffered,
      skillsWanted,
      availability,
      user: req.user._id,
      // isPublic,
    });
    console.log(newSkill);
    await newSkill.save();
    const user = await User.findById(req.user._id);
    user.skills.push(newSkill._id);
    await user.save();

    req.flash("success", "Skill added to your profile!");
    //  res.render("showdash", { user });
    res.redirect("/detailuser");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong");
    res.redirect("/error");
  }
};