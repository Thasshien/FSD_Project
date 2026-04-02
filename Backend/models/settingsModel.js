const mongoose = require('mongoose')

const settingsSchema = new mongoose.Schema(
    {
        key:{type:String,required:true,unique:true},
        restaurantName:{type:String,default:"Food Prep"},
        opensAtHour:{type:Number,default:10},
        closesAtHour:{type:Number,default:22},
        lowStockThreshold:{type:Number,default:3},
    },
    {minimize:false}
)

const settingsModel = mongoose.models.Settings || mongoose.model("Settings",settingsSchema)
module.exports = settingsModel
