const express = require('express')
const  {placeOrder,verifyOrder,userOrders,listOrders,updateStatus,getCheckoutQuote,cancelOrder} = require('../controllers/orderController')
const orderRouter = express.Router()
const authMiddleware = require('../middlewares/auth')

orderRouter.post('/quote',authMiddleware,getCheckoutQuote);
orderRouter.post('/place',authMiddleware,placeOrder);
orderRouter.get('/userorders',authMiddleware,userOrders);
orderRouter.post('/cancel',authMiddleware,cancelOrder);
orderRouter.post("/verify",verifyOrder)
orderRouter.get('/list',listOrders)
orderRouter.post('/status',updateStatus)

module.exports = orderRouter 
