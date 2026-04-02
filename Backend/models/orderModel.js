const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema(
    {
        userId:{type:String,required:true},
        items:{type:Array,required:true},
        amount:{type:"Number",required:true},
        pricing:{
            subtotal:{type:Number,default:0},
            gstAmount:{type:Number,default:0},
            deliveryFee:{type:Number,default:0},
            peakSurcharge:{type:Number,default:0},
            total:{type:Number,default:0}
        },
        deliveryMeta:{
            distanceKm:{type:Number,default:0},
            label:{type:String,default:""},
            estimatedDeliveryMinutes:{type:Number,default:30},
            pincodeServiceable:{type:Boolean,default:true}
        },
        address:{type:Object,required:true},
        status:{type:String,default:"Food Processing"},
        date:{type:Date,default:Date.now()},
        payment:{type:Boolean,default:false},
        cancellation:{
            allowedUntil:{type:Date},
            cancelledAt:{type:Date,default:null},
            reason:{type:String,default:""},
            isCancelled:{type:Boolean,default:false}
        }
    }
)


const orderModel = mongoose.models.Order || mongoose.model("Order",orderSchema)
module.exports = orderModel
