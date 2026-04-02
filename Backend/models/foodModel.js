const mongoose = require('mongoose')
const foodSchema = new mongoose.Schema(
    {
        name:{
            type:String, required:true
        },
        description:{
            type:String, required:true
        },
        price:{
            type:"Number", required:true
        },
        image:{
            type:String,
            required:true
        },
        category:{
            type:String,
            required:true
        },
        nutrition:{
            calories:{type:Number,required:true},
            sodium:{type:Number,required:true,default:0},
            sugar:{type:Number,required:true,default:0},
            protein:{type:Number,default:0},
            carbs:{type:Number,default:0},
            fat:{type:Number,default:0}
        },
        dietaryInfo:{
            containsPeanuts:{type:Boolean,default:false},
            containsDairy:{type:Boolean,default:false},
            containsGluten:{type:Boolean,default:false},
            diabeticFriendly:{type:Boolean,default:false},
            vegan:{type:Boolean,default:false},
            spicy:{type:Boolean,default:false}
        },
        allergens:{
            type:[String],
            default:[]
        },
        healthTags:{
            type:[String],
            default:[]
        },
        available:{
            type:Boolean,
            default:true
        },
        stock:{
            type:Number,
            default:10,
            min:0
        },
        prepTimeMinutes:{
            type:Number,
            default:25
        },
        gstRate:{
            type:Number,
            default:12
        }
    }
)
const foodModel = mongoose.models.food || mongoose.model("Food",foodSchema)
module.exports = foodModel
