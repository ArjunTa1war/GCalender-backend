require("dotenv").config()
const connectToMongo =require("./db");
connectToMongo();
const express = require("express")
var fetchuser = require("./middleware/fetchUser")
const app  = express();
const port = 4000;
const User = require("./models/user")
const Events = require("./models/event")
var jwt = require("jsonwebtoken")
const JWT_SECRET = process.env.JWT_SECRET
const cors = require('cors');
const { Suprsend} = require("@suprsend/node-sdk");
const { Event } = require("@suprsend/node-sdk");
const supr_client = new Suprsend(process.env.WKEY, process.env.WSECRET);
//middleware if we want to read the json and req file
app.use(cors());
app.use(express.json());

/*******************************add to database and register on suprsend************************/

app.post("/register",async(req,res)=>{
    let success = false;
    const user = await User.create({
        email : req.body.email,
        name : req.body.name,
        phone : req.body.phone,
        password : req.body.password
    })
    const data = {
        user : {
            id : user.id
        }
    }
    const authtoken = jwt.sign(data,JWT_SECRET);
    success = true;
    const distinct_id = user.email;
    const user1 = supr_client.user.get_instance(distinct_id);
    user1.add_email(user.email) 
    user1.add_sms("+"+user.phone) 
    user1.add_whatsapp("+"+user.phone)
    const response = user1.save()
    response.then((res) => console.log("response", res));
    res.json({success,authtoken});
})

/*****************************login user *******************************************************/

app.post("/login",async(req,res)=>{
    const {email,password} = req.body;
    let success = false;
    let user = await User.findOne({email : email});
    if(!user){
     return res.status(400).json({success,message : "user doesnot exists"})
    }
    if(password!=user.password)return res.status(400).json({success,message:"password is wrong"})
    const data = {
      user : {
         id : user.id
      }
    }
    const authtoken = jwt.sign(data,JWT_SECRET);
    success = true;
    res.json({success,authtoken});
 })

 app.get("/getdata",(req,res)=>{
    res.send("hello");
 })


 /*****************************fetch all events *******************************************************/

 app.get("/fetchallevents",fetchuser,async(req,res)=>{
    try {
      const events = await Events.find({ collaborators: { $elemMatch: { user: req.user.id } } })
      .sort({ updatedAt: -1 });
      res.json(events);
    } catch (error) {
    console.error(error.message);
    res.status(500).send("some error occured");
    }
})


/***************************** Add events *******************************************************/

app.post("/addevent",fetchuser,async(req,res)=>{
    try {
      const event = new Events({
        author : req.user.id,
        id : req.body.id,
        title : req.body.title,
        start : req.body.start,
        end : req.body.end,
        allDay : req.body.allDay,
        collaborators: [{ user: req.user.id }],
    })
    const savedevent = await event.save();
    const updatedEvent = await Events.findOneAndUpdate(
      { _id: savedevent._id }, 
      { $set: { id: savedevent._id } },
      { new: true } 
    );
    res.json(savedevent);
    } catch (error) {
      console.error(error.message);
      res.status(500).send("some error occured");
    }
  })
  
/***************************** delete events *******************************************************/

app.delete("/deleteevent/:id",async (req, res) => {
  try {
      let event = await Events.findById(req.params.id);
      if(!event){return res.status(404).send("NOT Found")}
      event = await Events.findByIdAndDelete(req.params.id);
      res.json({event});
  } catch (error) {
      console.error(error.message);
      res.status(500).send("some error occured");
  }
})


/***************************** Share events *******************************************************/

app.post("/shareevent", fetchuser, async (req, res) => {
  try {
    let success = false;
    const { share, eventid } = req.body;
    let user = await User.findOne({ email: share });
    
    if (!user) {
      return res.status(404).json({ success, message: "no such user exists" });
    }
    let user2 = await User.findById(req.user.id);
    let event1 = await Events.findById(eventid);
    if (!event1) {
      return res.status(404).json({ success,error: 'event not found' });
    }
    event1.collaborators.push({ user: user._id });
    await event1.save();
    success = true;

    const dateString = event1.start;
    const dateObject = new Date(dateString);
    const formattedDate = dateObject.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    // Format time as 'hh:mm AM/PM'
    const formattedTime = dateObject.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
     
    console.log(formattedDate,formattedTime);
    const distinct_id = user.email; 
    const event_name = "EVENTSHARED" 
    const properties = {				
      "recep":user.name,									
      "owner":user2.name,
      "title":event1.title,
      "date":formattedDate,
      "time":formattedTime
    }  
    
    const event = new Event(distinct_id, event_name, properties)
    const response  = supr_client.track_event(event)
    response.then((res) => console.log("response", res));

   return res.json({ success, event1});

  } catch (error) {
    console.error(error.message);
    return res.status(500).send("some error occurred");
  }
});

 /**********************listening on port **************************************/

app.listen(port,()=>{
    console.log("server started on port 4000");
})

 