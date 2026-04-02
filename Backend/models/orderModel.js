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
            discountAmount:{type:Number,default:0},
            total:{type:Number,default:0}
        },
        deliveryMeta:{
            distanceKm:{type:Number,default:0},
            label:{type:String,default:""},
            estimatedPrepMinutes:{type:Number,default:25},
            estimatedDeliveryMinutes:{type:Number,default:30},
            estimatedReadyAt:{type:Date,default:null},
            estimatedDeliveryAt:{type:Date,default:null},
            pincodeServiceable:{type:Boolean,default:true}
        },
        address:{type:Object,required:true},
        status:{type:String,default:"Food Processing"},
        date:{type:Date,default:Date.now()},
        payment:{type:Boolean,default:false},
        paymentMeta:{
            provider:{type:String,default:"stripe"},
            checkoutSessionId:{type:String,default:""},
            paymentIntentId:{type:String,default:""},
            paymentStatus:{type:String,default:"pending"},
            amountReceived:{type:Number,default:0},
            currency:{type:String,default:"inr"},
            paidAt:{type:Date,default:null}
        },
        cancellation:{
            allowedUntil:{type:Date},
            cancelledAt:{type:Date,default:null},
            reason:{type:String,default:""},
            isCancelled:{type:Boolean,default:false}
        },
        refund:{
            status:{type:String,default:"not_requested"},
            provider:{type:String,default:"stripe"},
            refundId:{type:String,default:""},
            amount:{type:Number,default:0},
            currency:{type:String,default:"inr"},
            initiatedAt:{type:Date,default:null},
            completedAt:{type:Date,default:null},
            note:{type:String,default:""}
        }
    }
)


const orderModel = mongoose.models.Order || mongoose.model("Order",orderSchema)
module.exports = orderModel
