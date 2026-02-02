const express = require('express');
const router = express.Router();
const wrapasync = require('../utils/wrapasyns');
const upload = require('../upload');
const { isloggedIn, saveRedirectUrl } = require("../middleware");

const usercontroller = require('../controllers/user');

const passport = require('passport');

router
.route('/signin')
.get(usercontroller.signup)
.post(wrapasync(usercontroller.signupPost));

router
.route('/login')
.get(usercontroller.login)
.post(wrapasync(usercontroller.loginPost));

router
.route('/logout')
.get(usercontroller.logOut);

router
.route('/userDash')
.get(isloggedIn,usercontroller.userDash)
.post(usercontroller.userDashPost);




module.exports = router;

