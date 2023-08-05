require("dotenv").config()
const mongoose = require("mongoose");

const connectToMongo = async()=>{
    const URI = process.env.MONGO_URI
    mongoose.connect(URI,{useNewUrlParser:true});
}

module.exports = connectToMongo;