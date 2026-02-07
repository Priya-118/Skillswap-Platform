const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo").default;
const app = express();
const path = require("path");
const User = require("./models/user");
const Skill = require("./models/skill");
const Review = require("./models/review");
const userRouter = require('./routes/user');
const passport = require("passport");
const LocalStrategy = require("passport-local");
const cookieParser = require("cookie-parser");
const { isloggedIn } = require("./middleware");
const flash = require("connect-flash");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
app.use(flash());
// const path = require("path");





app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

//Routes
app.use('/', userRouter);



// user dashboard
app.get("/user/:id/detailuser", isloggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("skills");
    res.render("userdash", { user });
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to load dashboard");
    res.redirect("/");
  }
});
// Ensure both GET and POST use the same path if that's what your form points to
app.post("/user/:id/detailuser", isloggedIn, async (req, res) => { // Added isloggedIn here
  try {
    const{id}=req.params;
    const { username, location, skillsOffered, skillsWanted, availability } = req.body;

    const updateUser = await User.findByIdAndUpdate(id, {
      username,
      location,
      availability,
      // Safety check: only split if the value exists
      skillsOffered: skillsOffered ? skillsOffered.split(',').map(s => s.trim()) : [],
      skillsWanted: skillsWanted ? skillsWanted.split(',').map(s => s.trim()) : []
    }, { new: true });

    req.flash("success", "Profile updated!");
    res.redirect(`/user/${id}/detailuser`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong");
    res.redirect("/signin");
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
  //pagination logic=>
  const LIMIT = 3;
  const page=parseInt(req.query.page) || 1;
  const skip= (page -1)*LIMIT;

  let user = await User.find(query).populate("skills")
  .sort({createdAt: -1})
  .skip(skip)
  .limit(LIMIT);

  const totalUsers=await User.countDocuments(query);
  const totalPages= Math.ceil(totalUsers/LIMIT);
  res.render("index", { 
    user,
    currentPage : page,
    totalPages
   });
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
  req.flash("success", "Request sent successfully!");
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

