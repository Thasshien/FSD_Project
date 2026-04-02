const settingsModel = require('../models/settingsModel')

const SETTINGS_KEY = "restaurant-config"

const getOrCreateSettings = async () => {
    let settings = await settingsModel.findOne({key:SETTINGS_KEY})
    if(!settings){
        settings = await settingsModel.create({key:SETTINGS_KEY})
    }
    return settings
}

const getSettings = async(req,res)=>{
    try {
        const settings = await getOrCreateSettings()
        res.status(200).json({data:settings})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Unable to fetch settings"})
    }
}

const updateSettings = async(req,res)=>{
    try {
        const settings = await getOrCreateSettings()
        const updatedSettings = await settingsModel.findByIdAndUpdate(
            settings._id,
            {
                ...(req.body.restaurantName !== undefined ? {restaurantName:req.body.restaurantName} : {}),
                ...(req.body.opensAtHour !== undefined ? {opensAtHour:Number(req.body.opensAtHour)} : {}),
                ...(req.body.closesAtHour !== undefined ? {closesAtHour:Number(req.body.closesAtHour)} : {}),
                ...(req.body.lowStockThreshold !== undefined ? {lowStockThreshold:Number(req.body.lowStockThreshold)} : {}),
            },
            {new:true}
        )
        res.status(200).json({message:"Settings updated successfully", data:updatedSettings})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Unable to update settings"})
    }
}

module.exports = {getSettings,updateSettings,getOrCreateSettings}
