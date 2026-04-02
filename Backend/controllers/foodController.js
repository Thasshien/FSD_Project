const foodModel = require('../models/foodModel')
const fsPromises = require('fs').promises
const path = require('path')
const { getGstRateForItem } = require('../utils/orderRules')
const { derivePrepTimeMinutes, getEffectivePrepTimeMinutes } = require('../utils/prepTimeRules')

const toNumber = (value, fallback = 0) => {
    const parsedValue = Number(value)
    return Number.isNaN(parsedValue) ? fallback : parsedValue
}

const parseJsonField = (value, fallback) => {
    if (!value) return fallback

    try {
        return JSON.parse(value)
    } catch (error) {
        return fallback
    }
}

const toBoolean = (value, fallback = false) => {
    if (value === undefined || value === null) return fallback
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') return value.toLowerCase() === 'true'
    return Boolean(value)
}

const addFood = async(req,res)=>{
    let image_filename =`${req.file.filename}` 

    try {
        const nutritionInput = parseJsonField(req.body.nutrition, {})
        const dietaryInfoInput = parseJsonField(req.body.dietaryInfo, {})
        const allergensInput = parseJsonField(req.body.allergens, [])
        const healthTagsInput = parseJsonField(req.body.healthTags, [])

        await foodModel.create({
            name:req.body.name,
            description:req.body.description,
            price:req.body.price,
            category:req.body.category,
            image:image_filename,
            available:toBoolean(req.body.available,true),
            stock:toNumber(req.body.stock,10),
            prepTimeMinutes:toNumber(
                req.body.prepTimeMinutes,
                derivePrepTimeMinutes({name:req.body.name, category:req.body.category})
            ),
            gstRate:toNumber(req.body.gstRate,getGstRateForItem({category:req.body.category})),
            nutrition:{
                calories:toNumber(nutritionInput.calories),
                sodium:toNumber(nutritionInput.sodium),
                sugar:toNumber(nutritionInput.sugar),
                protein:toNumber(nutritionInput.protein),
                carbs:toNumber(nutritionInput.carbs),
                fat:toNumber(nutritionInput.fat),
            },
            dietaryInfo:{
                containsPeanuts:Boolean(dietaryInfoInput.containsPeanuts),
                containsDairy:Boolean(dietaryInfoInput.containsDairy),
                containsGluten:Boolean(dietaryInfoInput.containsGluten),
                diabeticFriendly:Boolean(dietaryInfoInput.diabeticFriendly),
                vegan:Boolean(dietaryInfoInput.vegan),
                spicy:Boolean(dietaryInfoInput.spicy),
            },
            allergens:Array.isArray(allergensInput)
                ? allergensInput.map((item)=>String(item).trim()).filter(Boolean)
                : [],
            healthTags:Array.isArray(healthTagsInput)
                ? healthTagsInput.map((item)=>String(item).trim()).filter(Boolean)
                : [],
        })
        res.status(201).json({"message":"Food added Successfully"})

    } catch (error) {
        console.log(error)
        res.status(500).json({"message":"Error adding food"})
    }
}

const listFood = async(req,res)=>{
    try {
        const foods = await foodModel.find({})
        const bulkUpdates = []
        const normalizedFoods = foods.map((food)=>{
            const normalizedFood = food.toObject()
            const effectivePrepTimeMinutes = getEffectivePrepTimeMinutes(normalizedFood)

            if(Number(normalizedFood.prepTimeMinutes) !== effectivePrepTimeMinutes){
                bulkUpdates.push({
                    updateOne:{
                        filter:{_id:food._id},
                        update:{prepTimeMinutes:effectivePrepTimeMinutes},
                    }
                })
            }

            return {
                ...normalizedFood,
                prepTimeMinutes:effectivePrepTimeMinutes,
            }
        })

        if(bulkUpdates.length){
            await foodModel.bulkWrite(bulkUpdates)
        }

        res.json({data:normalizedFoods})
    } catch (error) {
        console.log(error)
        res.status(500).json({"message":"Error listing food"})
    }
}

const removeFood = async(req,res)=>{
    try {
        const {id} = req.query
        console.log(id);
        const food = await foodModel.findById(id)
        if(!food)
            return res.status(404).json({"message":"Food not found"})

        await fsPromises.unlink(path.join(__dirname,'..','uploads',`${food.image}`))
        await foodModel.deleteOne({_id:id})
        res.status(200).json({"message":"Food deleted successfully"})

    } catch (error) {
        console.log(error)
        res.status(500).json({"message":"Error deleting foods"})        
    }
}

const updateFoodMeta = async(req,res)=>{
    try {
        const { id, available, stock, prepTimeMinutes, gstRate } = req.body
        const food = await foodModel.findById(id)

        if(!food)
            return res.status(404).json({"message":"Food not found"})

        const updatedFood = await foodModel.findByIdAndUpdate(
            id,
            {
                ...(available !== undefined ? {available:toBoolean(available, food.available)} : {}),
                ...(stock !== undefined ? {stock:toNumber(stock, food.stock)} : {}),
                ...(prepTimeMinutes !== undefined ? {prepTimeMinutes:toNumber(prepTimeMinutes, food.prepTimeMinutes)} : {}),
                ...(gstRate !== undefined ? {gstRate:toNumber(gstRate, food.gstRate)} : {}),
            },
            {new:true}
        )

        res.status(200).json({message:"Food updated successfully", data:updatedFood})
    } catch (error) {
        console.log(error)
        res.status(500).json({"message":"Error updating food"})
    }
}

module.exports = {addFood,listFood,removeFood,updateFoodMeta}
