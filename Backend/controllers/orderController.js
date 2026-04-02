const orderModel = require('../models/orderModel')
const userModel = require('../models/userModel')
const foodModel = require('../models/foodModel')
const mongoose = require('mongoose')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { buildOrderQuote, RESTAURANT_RULES } = require('../utils/orderRules')

const getFoodLookupFromItems = async (items = []) => {
    const lookup = new Map()
    const itemIds = [...new Set(items.map((item)=>String(item?._id || item?.id || "")).filter(Boolean))]
    const validObjectIds = itemIds.filter((id)=>mongoose.Types.ObjectId.isValid(id))

    if(validObjectIds.length){
        const foods = await foodModel.find({_id:{$in:validObjectIds}})
        foods.forEach((food)=>lookup.set(String(food._id), food))
    }

    items.forEach((item)=>{
        const itemId = String(item?._id || item?.id || "")
        if(!itemId || lookup.has(itemId)) return

        if(item?.localImage || !mongoose.Types.ObjectId.isValid(itemId)){
            lookup.set(itemId,{
                _id:itemId,
                name:item.name,
                image:item.image,
                price:Number(item.price || 0),
                category:item.category,
                available:item.available !== false,
                stock:Number(item.stock ?? 20),
                prepTimeMinutes:Number(item.prepTimeMinutes ?? 25),
                gstRate:Number(item.gstRate ?? 12),
            })
        }
    })

    return lookup
}

const isPersistedFoodId = (itemId) => mongoose.Types.ObjectId.isValid(String(itemId || ""))

const getCheckoutQuote = async (req,res)=>{
    try {
        const foodLookup = await getFoodLookupFromItems(req.body.items || [])
        const quote = await buildOrderQuote({
            items:req.body.items || [],
            address:req.body.address || {},
            foodLookup,
        })

        res.status(200).json(quote)
    } catch (error) {
        console.log(error)
        res.status(500).json({"message":"Unable to build order quote"})
    }
}

const placeOrder = async(req,res)=>{
    const frontend_url = req.body.origin || process.env.FRONTEND_URL || 'http://localhost:5173'

    try {
        const user = await userModel.findById(req.userId)
        if(!user)
            return res.status(404).json({"message":"User not found"})

        const foodLookup = await getFoodLookupFromItems(req.body.items || [])
        const quote = await buildOrderQuote({
            items:req.body.items || [],
            address:req.body.address || {},
            foodLookup,
        })

        if(!quote.ok){
            return res.status(400).json({
                message:"Order validation failed",
                errors:quote.errors,
                warnings:quote.warnings,
                quote,
            })
        }

        const newOrder = await orderModel.create(
            {
                userId:req.userId,
                items:quote.items,
                amount:quote.pricing.total,
                pricing:quote.pricing,
                deliveryMeta:{
                    distanceKm:quote.rules.deliveryZone.distanceKm,
                    label:quote.rules.deliveryZone.label,
                    estimatedDeliveryMinutes:quote.rules.estimatedDeliveryMinutes,
                    pincodeServiceable:quote.rules.deliveryZone.available,
                },
                address:req.body.address,
                cancellation:{
                    allowedUntil:new Date(Date.now() + RESTAURANT_RULES.cancelWindowMinutes * 60 * 1000),
                }
            }
        )

        for(const item of quote.items){
            if(isPersistedFoodId(item._id)){
                await foodModel.findByIdAndUpdate(item._id, {$inc:{stock:-item.quantity}})
            }
        }

        await userModel.findByIdAndUpdate(req.userId,{cartData:{}})

        const line_items = quote.items.map((item)=>({
            price_data:{
                currency : 'inr',
                product_data:{
                    name:`${item.name} (${item.gstRate}% GST)`
                },
                unit_amount:Math.round((item.price + item.itemGst / item.quantity) * 100)
            },
            quantity:item.quantity
        }))

        if(quote.pricing.deliveryFee > 0){
            line_items.push({
                price_data:{
                    currency : 'inr',
                    product_data:{
                        name:'Delivery Charge'
                    },
                    unit_amount:Math.round(quote.pricing.deliveryFee * 100)
                },
                quantity:1
            })
        }

        if(quote.pricing.peakSurcharge > 0){
            line_items.push({
                price_data:{
                    currency : 'inr',
                    product_data:{
                        name:'Peak Hour Surcharge'
                    },
                    unit_amount:Math.round(quote.pricing.peakSurcharge * 100)
                },
                quantity:1
            })
        }

        const session = await stripe.checkout.sessions.create({
            line_items,
            mode:'payment',
            success_url:`${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url:`${frontend_url}/verify?success=false&orderId=${newOrder._id}`
        })

        res.json({session_url:session.url, quote})

    } catch (error) {
        console.log(error)
        res.status(500).json({"message":error.message})
    }

}

const verifyOrder = async(req,res)=>{
    const {orderId,success}=req.body;
    try {
        const order = await orderModel.findById(orderId)
        if(!order)
            return res.status(404).json({"message":"Order not found"})

        if(success==='true'){
            await orderModel.findByIdAndUpdate(orderId,{payment:true})
            res.json({"message":"Payment successful"})
        }
        else{
            for(const item of order.items){
                if(isPersistedFoodId(item._id)){
                    await foodModel.findByIdAndUpdate(item._id, {$inc:{stock:item.quantity}})
                }
            }
            await orderModel.findByIdAndDelete(orderId)
            res.json({"message":"Not paid"})
        }
    } catch (error) {
        console.log(error)
        res.json({"message":error.message})
    }
}

const userOrders = async(req,res)=>{
    try {
        const orders = await orderModel.find({userId:req.userId}).sort({date:-1, _id:-1})
        res.status(200).json({data:orders})
    } catch (error) {
        console.log(error)
        res.status(500).json({"message":"internal server error"})
    }
}

const listOrders = async(req,res)=>{
    try {
        const orders = await orderModel.find().sort({date:-1, _id:-1})
        res.json({data:orders})
    } catch (error) {
        console.log(error)
        res.json({"message":error.message})
    }
}

const updateStatus = async(req,res)=>{
    try {
        const order = await orderModel.findById(req.body.orderId)
        if(!order)
            return res.status(404).json({"message":"Order not found"})

        const nextStatus = req.body.status
        const cancellation = {...(order.cancellation || {})}
        if(nextStatus === "Out For Delivery" || nextStatus === "Delivered"){
            cancellation.allowedUntil = new Date()
        }
        if(nextStatus === "Cancelled" && !order.cancellation?.isCancelled){
            for(const item of order.items){
                if(isPersistedFoodId(item._id)){
                    await foodModel.findByIdAndUpdate(item._id, {$inc:{stock:item.quantity}})
                }
            }
            cancellation.allowedUntil = new Date()
            cancellation.cancelledAt = new Date()
            cancellation.isCancelled = true
            cancellation.reason = cancellation.reason || "Cancelled by admin"
        }

        await orderModel.findByIdAndUpdate(req.body.orderId,{status:nextStatus, cancellation})
        res.json({"message":"status updated"})
    } catch (error) {
        console.log(error)
        res.json({"message":error.message})
    }
}

const cancelOrder = async(req,res)=>{
    try {
        const order = await orderModel.findById(req.body.orderId)
        if(!order || String(order.userId) !== String(req.userId))
            return res.status(404).json({"message":"Order not found"})

        if(order.status === "Out For Delivery" || order.status === "Delivered"){
            return res.status(400).json({"message":"This order can no longer be cancelled."})
        }

        if(order.cancellation?.isCancelled){
            return res.status(400).json({"message":"Order already cancelled."})
        }

        const allowedUntil = new Date(order.cancellation?.allowedUntil || order.date)
        if(Date.now() > allowedUntil.getTime()){
            return res.status(400).json({"message":`Orders can only be cancelled within ${RESTAURANT_RULES.cancelWindowMinutes} minutes.`})
        }

        for(const item of order.items){
            if(isPersistedFoodId(item._id)){
                await foodModel.findByIdAndUpdate(item._id, {$inc:{stock:item.quantity}})
            }
        }

        await orderModel.findByIdAndUpdate(req.body.orderId,{
            status:"Cancelled",
            cancellation:{
                ...(order.cancellation || {}),
                cancelledAt:new Date(),
                isCancelled:true,
                reason:req.body.reason || "Cancelled by user",
            }
        })

        res.status(200).json({"message":"Order cancelled successfully"})
    } catch (error) {
        console.log(error)
        res.status(500).json({"message":"Unable to cancel order"})
    }
}

module.exports = {placeOrder,verifyOrder,userOrders,listOrders,updateStatus,getCheckoutQuote,cancelOrder}
