import React from 'react'
import { useState } from 'react'
import {Routes,Route} from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar/Navbar'
import Home from './screen/Home/Home'
import MyOrders from './screen/MyOrders/MyOrders'
import Cart from './screen/Cart/Cart'
import Verify from './screen/Verify/Verify'
import PlaceOrder from './screen/Placeorder/Placeorder'
import Footer from './components/Footer/Footer'
import LoginPopup from './components/LoginPopup/LoginPopup'
import Food_Display from './components/Food_Display/Food_Display'
import {ToastContainer} from 'react-toastify'

const App = () => {

  const [showLogin,setShowLogin] = useState(false)

  return (
    <>
      <ToastContainer/>
      {showLogin?<LoginPopup setShowLogin={setShowLogin}/>:<></>}
      <div className='App'>
        <Navbar showLogin={showLogin} setShowLogin={setShowLogin} />
        <Routes>
          <Route path='/' element={<Home/>}></Route>
          <Route path='/menu' element={<Food_Display category='All'/>}></Route>
          <Route path='/cart' element={<Cart/>}></Route>
          <Route path='/order' element={<PlaceOrder/>}></Route>
          <Route path='/verify' element={<Verify />}></Route>
          <Route path='/myorders' element={<MyOrders/>}></Route>
        </Routes>
      </div>
      <Footer/>
    </>
  )
}

export default App