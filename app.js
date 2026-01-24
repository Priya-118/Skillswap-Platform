const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo").default;
const app = express();
const path = require("path");
const User = require("./models/user");
const Skill = require("./models/skill");
const Review = require("./models/review");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
app.use(flash());
const { isloggedIn } = require("./middleware");

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(cookieParser());

// MongoDB Connection
main()
  .then(() => console.log("working database"))
  .catch((err) => console.log(err));
async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/skillSwap");
}
const sessionOption = {
  secret: "mysecret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: "mongodb://127.0.0.1:27017/skillSwap",
    ttl: 7 * 24 * 60 * 60
  }),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};
app.use(session(sessionOption));
// These were missing!
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate())); // for login strategy
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//middleware for flash
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

app.get("/", (req, res) => {
  res.send("working");
});

app.get("/signin", (req, res) => {
  res.render("signin");
});

// auth
app.post("/signin", async (req, res, next) => {
  try {
    let { username, email, password } = req.body;
    let newUser = new User({ email, username });

    const RegisterUser = await User.register(newUser, password);
    await newUser.save();
    console.log(RegisterUser);

    req.login(RegisterUser, (err) => {
      if (err) return next(err); //
      req.flash("success", "Welcome to SkillSwap");
      res.redirect("/users");
    });
  } catch (e) {
    req.flash("error", `${e.message}`);
    res.redirect("/signin");
  }
});
// login
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res, next) => {
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
});

app.get("/logout", (req, res, next) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "you are logged out");
    res.redirect("/");
  });
});

app.get("/userDash", (req, res) => {
  res.render("userDash");
});

app.post("/userDash", async (req, res) => {
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
});

// user dashboard
app.get("/detailuser", isloggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("skills");
    res.render("showdash", { user });
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to load dashboard");
    res.redirect("/");
  }
});
//index route
// Updated Index Route
app.get("/users", async (req, res) => {
  let query = {};
  
  // If a user is logged in, exclude them from the list
  if (req.user) {
    query = { _id: { $ne: req.user._id } }; // $ne means "Not Equal"
  }

  let user = await User.find(query).populate("skills");
  res.render("index", { user });
});

//single user
app.get("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // find the user
    const user = await User.findById(id).populate("skills");
    if (!user) {
      return res.status(404).send("User not found");
    }
    // find the skills tied to this user
    const skills = await Skill.find({ user: id }).populate({
      path: "review",
      populate: { path: "reviewer", select: "username" },
    });
    
    res.render("userDetail", { user, skills });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching user details");
  }
});

app.post("/users/:id/review", isloggedIn, async (req, res) => {
  const { id } = req.params;
  const { comment, rating } = req.body;

  //find user
  const user = await User.findById(id).populate("skills");
  const review = new Review({ comment, rating, reviewer: req.user._id });
  review.author = req.user._id;

  if (!user || user.length == 0) {
    return res.status(404).send("user or skill not found");
  }
  console.log(review);
  await review.save();
  user.skills[0].review.push(review._id);
  await user.skills[0].save();
  req.flash("success", "Review added!");
  res.redirect(`/users/${id}`);
});

app.get("/users/:id/request", async (req, res) => {
  if (!req.user) {
    return res.redirect("/login");
  }

  const { id } = req.params;
  const senderId = req.user._id;

  const receiver = await User.findById(id); // consistent variable name

  res.render("request", { user: receiver });
});

app.post("/users/:id/request", async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const senderId = req.user._id;
  const receiver = await User.findById(id);
  if (!senderId) {
    res.redirect("/login");
  }
  if (!receiver) {
    return res.status(404).send("User not found");
  }
  receiver.requests.push({
    sender: senderId,
    message,
    status: "pending",
  });
  await receiver.save();
  res.redirect(`/users/${id}`);
});

app.get('/notification', isloggedIn, async (req, res) => {
  try {
    // 1. Requests RECEIVED (Existing logic)
    const user = await User.findById(req.user._id).populate({
      path: 'requests.sender',
      select: 'username email'
    });
    const receivedRequests = user.requests;

    // 2. Requests SENT (New logic)
    // Find all users who have a request from the current logged-in user
    const sentToUsers = await User.find({ "requests.sender": req.user._id })
      .select("username requests") // Get the username of the person you requested
      .lean();

    // Filter out only the specific request objects you sent to those users
    let sentRequests = [];
    sentToUsers.forEach(u => {
      u.requests.forEach(r => {
        if (r.sender.toString() === req.user._id.toString()) {
          sentRequests.push({
            receiverName: u.username,
            message: r.message,
            status: r.status,
            createdAt: r.createdAt
          });
        }
      });
    });

    res.render('notification.ejs', { 
      notifications: receivedRequests, 
      sentRequests: sentRequests 
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not load requests.");
    res.redirect("/users");
  }
});

const port = 4000;
app.listen(port, () => {
  console.log(`Server running on ADDRESS http://localhost:${port}`);
});

