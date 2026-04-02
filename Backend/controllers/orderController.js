const orderModel = require('../models/orderModel')
const userModel = require('../models/userModel')
const foodModel = require('../models/foodModel')
const mongoose = require('mongoose')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { buildOrderQuote, RESTAURANT_RULES } = require('../utils/orderRules')
const { getEffectivePrepTimeMinutes } = require('../utils/prepTimeRules')

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
                prepTimeMinutes:getEffectivePrepTimeMinutes(item),
                gstRate:Number(item.gstRate ?? 12),
            })
        }
    })

    return lookup
}

const isPersistedFoodId = (itemId) => mongoose.Types.ObjectId.isValid(String(itemId || ""))

const buildRefundState = (overrides = {}) => ({
    status:'not_requested',
    provider:'stripe',
    refundId:'',
    amount:0,
    currency:'inr',
    initiatedAt:null,
    completedAt:null,
    note:'',
    ...overrides,
})

const processRefundForOrder = async (order, cancellationReason = "requested_by_customer") => {
    if(!order?.payment){
        return buildRefundState({
            status:'not_required',
            note:'No captured payment was found for this order, so no refund was needed.',
        })
    }

    if(order?.refund?.status === 'succeeded' || order?.refund?.status === 'pending'){
        return {
            ...buildRefundState(order.refund?.toObject ? order.refund.toObject() : order.refund),
            note:order.refund?.note || 'Refund is already being processed for this order.',
        }
    }

    let paymentIntentId = order?.paymentMeta?.paymentIntentId || ""
    const checkoutSessionId = order?.paymentMeta?.checkoutSessionId || ""

    try {
        if(!paymentIntentId && checkoutSessionId){
            const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId)
            paymentIntentId = String(checkoutSession?.payment_intent || "")
        }

        if(!paymentIntentId){
            return buildRefundState({
                status:'manual_review',
                initiatedAt:new Date(),
                amount:Number(order.amount || 0),
                currency:String(order?.paymentMeta?.currency || 'inr').toLowerCase(),
                note:'Payment was received, but the Stripe payment reference is missing. Please process the refund manually from the Stripe dashboard.',
            })
        }

        const refund = await stripe.refunds.create({
            payment_intent:paymentIntentId,
            reason:['requested_by_customer', 'duplicate', 'fraudulent'].includes(cancellationReason)
                ? cancellationReason
                : 'requested_by_customer',
            metadata:{
                orderId:String(order._id),
            }
        })

        const refundStatus = refund.status === 'succeeded' ? 'succeeded' : 'pending'
        const completedAt = refund.status === 'succeeded' ? new Date() : null

        return buildRefundState({
            status:refundStatus,
            refundId:refund.id,
            amount:Number((refund.amount || 0) / 100),
            currency:String(refund.currency || order?.paymentMeta?.currency || 'inr').toLowerCase(),
            initiatedAt:new Date(refund.created * 1000),
            completedAt,
            note:refundStatus === 'succeeded'
                ? 'Refund has been initiated to the customer\'s original payment method via Stripe.'
                : 'Refund request has been sent to Stripe and is currently being processed.',
        })
    } catch (error) {
        console.log(error)
        return buildRefundState({
            status:'manual_review',
            initiatedAt:new Date(),
            amount:Number(order.amount || 0),
            currency:String(order?.paymentMeta?.currency || 'inr').toLowerCase(),
            note:'We could not confirm the Stripe refund automatically. Please review this order manually in the Stripe dashboard.',
        })
    }
}

const getCheckoutQuote = async (req,res)=>{
    try {
        const foodLookup = await getFoodLookupFromItems(req.body.items || [])
        const quote = await buildOrderQuote({
            items:req.body.items || [],
            address:req.body.address || {},
            foodLookup,
            promoCode:req.body.promoCode || "",
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
            promoCode:req.body.promoCode || "",
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
                    estimatedPrepMinutes:quote.rules.estimatedPrepMinutes,
                    estimatedDeliveryMinutes:quote.rules.estimatedDeliveryMinutes,
                    estimatedReadyAt:quote.rules.estimatedReadyAt,
                    estimatedDeliveryAt:quote.rules.estimatedDeliveryAt,
                    pincodeServiceable:quote.rules.deliveryZone.available,
                },
                address:req.body.address,
                cancellation:{
                    allowedUntil:new Date(Date.now() + RESTAURANT_RULES.cancelWindowMinutes * 60 * 1000),
                },
                refund:buildRefundState(),
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
            metadata:{
                orderId:String(newOrder._id),
                userId:String(req.userId),
            },
            success_url:`${frontend_url}/verify?success=true&orderId=${newOrder._id}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:`${frontend_url}/verify?success=false&orderId=${newOrder._id}&session_id={CHECKOUT_SESSION_ID}`
        })

        await orderModel.findByIdAndUpdate(newOrder._id,{
            paymentMeta:{
                provider:'stripe',
                checkoutSessionId:session.id,
                paymentIntentId:String(session.payment_intent || ''),
                paymentStatus:String(session.payment_status || 'pending'),
                amountReceived:0,
                currency:String(session.currency || 'inr').toLowerCase(),
                paidAt:null,
            }
        })

        res.json({session_url:session.url, quote})

    } catch (error) {
        console.log(error)
        res.status(500).json({"message":error.message})
    }

}

const verifyOrder = async(req,res)=>{
    const {orderId,success,sessionId}=req.body;
    try {
        const order = await orderModel.findById(orderId)
        if(!order)
            return res.status(404).json({"message":"Order not found"})

        if(success==='true'){
            let paymentMeta = {
                ...(order.paymentMeta?.toObject ? order.paymentMeta.toObject() : (order.paymentMeta || {})),
                provider:'stripe',
                paymentStatus:'paid',
                paidAt:new Date(),
            }

            if(sessionId){
                const session = await stripe.checkout.sessions.retrieve(sessionId)
                paymentMeta = {
                    ...paymentMeta,
                    checkoutSessionId:session.id,
                    paymentIntentId:String(session.payment_intent || paymentMeta.paymentIntentId || ''),
                    paymentStatus:String(session.payment_status || 'paid'),
                    amountReceived:Number((session.amount_total || 0) / 100),
                    currency:String(session.currency || paymentMeta.currency || 'inr').toLowerCase(),
                    paidAt:session.status === 'complete' ? new Date() : paymentMeta.paidAt,
                }
            }

            await orderModel.findByIdAndUpdate(orderId,{
                payment:true,
                paymentMeta,
            })
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
        const cancellation = {...(order.cancellation?.toObject ? order.cancellation.toObject() : (order.cancellation || {}))}
        let refund = buildRefundState(order.refund?.toObject ? order.refund.toObject() : order.refund)
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
            refund = await processRefundForOrder(order, "requested_by_customer")
        }

        await orderModel.findByIdAndUpdate(req.body.orderId,{status:nextStatus, cancellation, refund})
        res.json({
            "message":nextStatus === "Cancelled"
                ? (refund.status === 'succeeded' || refund.status === 'pending'
                    ? 'Order cancelled and refund process started.'
                    : 'Order cancelled. Refund has been flagged for manual review.')
                : "status updated"
        })
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

        const refund = await processRefundForOrder(order, "requested_by_customer")

        await orderModel.findByIdAndUpdate(req.body.orderId,{
            status:"Cancelled",
            cancellation:{
                ...(order.cancellation || {}),
                cancelledAt:new Date(),
                isCancelled:true,
                reason:req.body.reason || "Cancelled by user",
            },
            refund,
        })

        res.status(200).json({"message":"Order cancelled successfully. Refund will be processed soon by Stripe."})
    } catch (error) {
        console.log(error)
        res.status(500).json({"message":"Unable to cancel order"})
    }
}

module.exports = {placeOrder,verifyOrder,userOrders,listOrders,updateStatus,getCheckoutQuote,cancelOrder}
