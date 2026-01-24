const mongoose = require("mongoose");
const User = require("../models/user");  // User model
const Skill = require("../models/skill"); // Skill model

// const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/skillSwap")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error(err));


async function seedDemoUsers() {
  try {
    // Clear old demo users
    await User.deleteMany({});
    await Skill.deleteMany({});

    // Create demo users
    const users = [
      { username: "Alice", email: "alice@test.com" ,},
      { username: "Bob", email: "bob@test.com" },
      { username: "Charlie", email: "charlie@test.com" },
      { username: "Diana", email: "diana@test.com" },
      { username: "Ethan", email: "ethan@test.com" },
    ];

    const createdUsers = await User.insertMany(users);

    // Create demo skills for each user
    const demoSkills = [
      {
        username: "Alice",
        location: "Delhi",
        profilePhoto: "https://i.pravatar.cc/150?img=1",
        skillsOffered: ["Graphic Design", "Photoshop"],
        skillsWanted: ["Excel", "Public Speaking"],
        availability: "Weekends",
        user: createdUsers[0]._id,
      },
      {
        username: "Bob",
        location: "Mumbai",
        profilePhoto: "https://i.pravatar.cc/150?img=2",
        skillsOffered: ["Excel", "Data Entry"],
        skillsWanted: ["Photoshop"],
        availability: "Evenings",
        user: createdUsers[1]._id,
      },
      {
        username: "Charlie",
        location: "Bangalore",
        profilePhoto: "https://i.pravatar.cc/150?img=3",
        skillsOffered: ["JavaScript", "React"],
        skillsWanted: ["UI/UX Design", "Figma"],
        availability: "Mornings",
        user: createdUsers[2]._id,
      },
      {
        username: "Diana",
        location: "Hyderabad",
        profilePhoto: "https://i.pravatar.cc/150?img=4",
        skillsOffered: ["Cooking", "Baking"],
        skillsWanted: ["Photography"],
        availability: "Afternoons",
        user: createdUsers[3]._id,
      },
      {
        username: "Ethan",
        location: "Pune",
        profilePhoto: "https://i.pravatar.cc/150?img=5",
        skillsOffered: ["Python", "Machine Learning"],
        skillsWanted: ["Public Speaking", "Leadership"],
        availability: "Weekends",
        user: createdUsers[4]._id,
      },
    ];

    const createdSkills = await Skill.insertMany(demoSkills);

    // Link skills back to users
    for (let i = 0; i < createdUsers.length; i++) {
      createdUsers[i].skills = [createdSkills[i]._id];
      await createdUsers[i].save();
    }

    console.log("🌱 Demo users & skills seeded successfully!");
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
    mongoose.connection.close();
  }
}

seedDemoUsers();
