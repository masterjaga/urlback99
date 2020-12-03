const express = require("express");
const mongodb = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcrypt");
const nodemailer=require('nodemailer');
require("dotenv").config();

const mongoClient = mongodb.MongoClient;
const objectId = mongodb.ObjectID;

const app = express();
const dbURL = process.env.DB_URL || "mongodb://127.0.0.1:27017";
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());

app.get("/", async (req, res) => {
  try {
    let clientInfo = await mongoClient.connect(dbURL);
    let db = clientInfo.db("Registration");
    let data = await db.collection("users").find().toArray();
    res.status(200).json({ data });
    clientInfo.close();
  } catch (error) {
    console.log(error);
    res.send(500);
  }
});

app.post("/add-user", async (req, res) => {
  try {
    let clientInfo = await mongoClient.connect(dbURL);
    let db = clientInfo.db("Registration");
    let data = await db.collection("users").insertOne(req.body);
    res.status(200).json({ message: "User created" });
    clientInfo.close();
  } catch (error) {
    console.log(error);
    res.status(500);
  }
});

app.get("/get-user/:id", async (req, res) => {
  try {
    let clientInfo = await mongoClient.connect(dbURL);
    let db = clientInfo.db("Registration");
    let data = await db
      .collection("users")
      .findOne({ _id: objectId(req.params.id) });
    res.status(200).json({ data });
    clientInfo.close();
  } catch (error) {
    console.log(error);
    res.send(500);
  }
});

app.post("/register", async (req, res) => {
  try {
    let clientInfo = await mongoClient.connect(dbURL);
    let db = clientInfo.db("Registration");
    let result = await db
      .collection("users")
      .findOne({ email: req.body.email });
    if (result) {
      res.status(400).json({ message: "User already registered" });
      clientInfo.close();
    } else {
      let salt = await bcrypt.genSalt(15);
      let hash = await bcrypt.hash(req.body.password, salt);
      req.body.password = hash;
      await db.collection("users").insertOne(req.body);
      res.status(200).json({ message: "User registered" });
      clientInfo.close();
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/login", async (req, res) => {
  try {
    let clientInfo = await mongoClient.connect(dbURL);
    let db = clientInfo.db("Registration");
    let result = await db
      .collection("users")
      .findOne({ email: req.body.email });
    if (result) {
      let isTrue = await bcrypt.compare(req.body.password, result.password);
      if (isTrue) {
        res.status(200).json({ message: "Login success" });
      } else {
        res.status(200).json({ message: "Login unsuccessful" });
      }
    } else {
      res.status(400).json({ message: "User not registered" });
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/forgot", async (req, res) => {
  try {
    let clientInfo = await mongoClient.connect(dbURL);
    let db = clientInfo.db("Registration");
    let result = await db
      .collection("users")
      .findOne({ email: req.body.email });
    if (result) {
        var string = Math.random().toString(36).substr(2, 10);
       let transporter = nodemailer.createTransport({
         host: "smtp.gmail.com",
         port: 587,
         secure: false, // true for 465, false for other ports
         auth: {
           user: process.env.SENDER, // generated ethereal user
           pass: process.env.PASS, // generated ethereal password
         },
       });

       // send mail with defined transport object
       let info = await transporter.sendMail({
         from:process.env.SENDER, // sender address
         to: req.body.email, // list of receivers
         subject: "Reset Password ✔", // Subject line
         text: "Hello world?", // plain text body
         html: `<a href="http://localhost:3000/auth/${req.body.email}/${string}">Click on this link </a>`, // html body
       });
       await db
         .collection("users")
         .updateOne({ email: req.body.email }, { $set: { "string": string } });
         res.status(200).json({message:'Check your email and reset your password'})
    } else {
      res.status(400).json({ message: "User not registered" });
    }
  } catch (error) {
    console.log(error);
  }
});

app.get('/auth/:mail/:string',async (req,res)=>{
    try {
    let clientInfo = await mongoClient.connect(dbURL);
    let db = clientInfo.db("Registration");
    let result = await db
      .collection("users")
      .findOne({ email: req.params.mail });
  
      if(result.string==req.params.string){
          res.redirect(`http://127.0.0.1:5501/reset.html?${req.params.mail}?${req.params.string}`);
        //   res.status(200).json({message:'matched'});
      }else{
           res.status(200).json({message:'Link Expired'})
      }
  } catch (error) {
    console.log(error);
  }
});

app.put('/resetpassword/:mail/:string',async(req,res)=>{
    try {
      let clientInfo = await mongoClient.connect(dbURL);
      let db = clientInfo.db("Registration");
      let result = await db
        .collection("users")
        .findOne({ email: req.params.mail });
        if(result.string==req.params.string){
            let salt = await bcrypt.genSalt(15);
            let hash = await bcrypt.hash(req.body.newPass, salt);
            req.body.newPass = hash;
             let data = await db
               .collection("users")
               .updateOne(
                 { email: req.params.mail },
                 { $set: { password: req.body.newPass } }
               );
             if(data){
                    res.status(200).json({ message: "Password Updated" });
             }
              
        }
      
      

      clientInfo.close();
    } catch (error) {
      console.log(error);
      res.status(500);
    }
})
app.put('/updateToken/:mail', async(req,res)=>{
    try{
       let clientInfo = await mongoClient.connect(dbURL);
       let db = clientInfo.db("Registration");
       let data = await db
         .collection("users")
         .updateOne(
           { email: req.params.mail },
           { $set: { string: '' } }
         )
         if(data){
              res.status(200).json({ message: "String Updated" });
         }
    }catch{

    }
})
app.listen(port, () => console.log("your app runs with port:", port));