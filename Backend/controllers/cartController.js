const userModel = require('../models/userModel')
const foodModel = require('../models/foodModel')
const { RESTAURANT_RULES } = require('../utils/orderRules')
const mongoose = require('mongoose')

const getUserData = async (userId) => {
    const userData = await userModel.findById(userId)
    if (!userData) return null
    return userData
}

const addToCart = async(req,res)=>{
    try {
        const userData = await getUserData(req.userId)
        if(!userData)
            return res.status(404).json({"message":"User not found"})

        if(!mongoose.Types.ObjectId.isValid(req.body.itemId))
            return res.status(400).json({"message":"Invalid food item"})

        const food = await foodModel.findById(req.body.itemId)
        if(!food)
            return res.status(404).json({"message":"Food not found"})

        const availableStock = Number(food.stock ?? 20)

        if(food.available === false || availableStock <= 0)
            return res.status(400).json({"message":"This item is currently unavailable"})

        const cartData = userData.cartData || {}
        const nextQuantity = (cartData[req.body.itemId] || 0) + 1

        if(nextQuantity > RESTAURANT_RULES.maxQuantityPerItem)
            return res.status(400).json({"message":`You can only add up to ${RESTAURANT_RULES.maxQuantityPerItem} of this item`})

        if(nextQuantity > availableStock)
            return res.status(400).json({"message":"Not enough stock available"})

        cartData[req.body.itemId] = nextQuantity

        await userModel.findByIdAndUpdate(req.userId,{cartData})
        res.status(200).json({"message":"item added to cart"})

    } catch (error) {
        console.log(error)
        res.status(500).json({"message":"Internal server error"})
    }
}
const getCart = async(req,res)=>{
    try {
        const userData = await getUserData(req.userId)
        if(!userData)
            return res.status(404).json({"message":"User not found"})

        const cartData = userData.cartData || {}
        res.status(200).json({cartData})
    } catch (error) {
        console.log(error)
        res.status(500).json({"message":"Internal server error"})
    }
}
const removeFromCart = async(req,res)=>{
    try {
        const userData = await getUserData(req.userId)
        if(!userData)
            return res.status(404).json({"message":"User not found"})

        const cartData = userData.cartData || {}
        if(req.query.itemId && cartData[req.query.itemId])
            cartData[req.query.itemId] = Math.max(cartData[req.query.itemId]-1,0)

        await userModel.findByIdAndUpdate(req.userId,{cartData})
        res.status(200).json({"message":"item removed from cart"})
    } catch (error) {
        console.log(error)
        res.status(500).json({"message":"Internal server error"})
    }
}
module.exports = {addToCart,getCart,removeFromCart}
