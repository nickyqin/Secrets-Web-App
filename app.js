//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// md5
const bcrypt = require("bcrypt");

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

//bcrypt
const saltRounds = 2;

//mongoose
main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/userDB');
}

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

// encrypting with a key
// const secret = process.env.DB_ENCRYPT;
// userSchema.plugin(encrypt, {secret: secret, encryptedFields: ["password"]});

const User = mongoose.model("User", userSchema);
//end mongoose

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  bcrypt.genSalt(saltRounds, (err, salt) => {
    bcrypt.hash(req.body.password, salt, (err, hash) => {
      if (!err) {
        const newUser = new User({
          email: req.body.username,
          password: hash
        });
        newUser.save(err => {
          if (err) console.log(err);
          else res.render("secrets");
        });
      }
    });
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  User.findOne({email: email}, (err, foundUser) => {
    if (err) {
      console.log(err);
    } else if (foundUser) {
      bcrypt.compare(password, foundUser.password, (err, result) => {
        if (result) {
          res.render("secrets");
        } else {
          console.log(err);
        }
      });
    }
  });
});









app.listen(3000, function() {
  console.log("Server started on port 3000");
});
