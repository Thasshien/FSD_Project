const express = require('express')
const { getSettings, updateSettings } = require('../controllers/settingsController')

const settingsRouter = express.Router()

settingsRouter.get('/', getSettings)
settingsRouter.post('/update', updateSettings)

module.exports = settingsRouter
