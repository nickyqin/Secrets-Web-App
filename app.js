//jshint esversion:6

//add FACEBOOK OAuth

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

//new packages
app.use(session({
  secret: process.env.DB_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
//end new packages

//mongoose
main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/userDB');
}

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});

//Strategy that hash and salt PWs, save users to mongodb database
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);
//end mongoose

passport.use(User.createStrategy());

//change serialize/deserialize based off passport code to work for all strategies
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    //userProfileURL?
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


const secretSchema = new mongoose.Schema({
  secret: String
});

const Secret = mongoose.model("Secret", secretSchema);


app.get("/", (req, res) => {
  res.render("home");
});

//google button redirects to this
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));
  //profile means email and userid

//redirect page after logged in with google (local auth)
app.get('/auth/google/secrets',
//authenticate locally, start session and create cookies
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {

      // Successful authentication, redirect secrets.
      res.redirect('/secrets');
    });

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  //should be passportLocalMongoose method
  User.register({username: req.body.username}, req.body.password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
        //redirect cause secrets should be available always when authenticated
        //even if I manually switch to that tab
      });
    }
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, (err) => {
    if (err) {
      return next(err);
    } else {
      passport.authenticate("local", { failureRedirect: '/login', failureMessage: true })(req, res, function() {
        res.redirect("/secrets");
      });
    }
  })
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()){

    Secret.count().exec(function(err, count) {
      const random = Math.floor(Math.random() * count);
      Secret.findOne().skip(random).exec(
        function(err, result) {
          res.render("secrets", {
            randomSecret: result.secret
          });
        }
      );
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", (req, res) => {
  newSecret = new Secret({
    secret: req.body.secret
  });
  newSecret.save( (err) => {
    if (!err) {
      console.log("Secret saved!");
      res.redirect("/secrets");
    }
  });
})

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
})








app.listen(3000, function() {
  console.log("Server started on port 3000");
});
