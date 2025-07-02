import React from 'react'
import {Routes,Route} from 'react-router-dom'
import Navbar from './Components/Navbar/Navbar'
import Sidebar from './Components/Sidebar/Sidebar'
import Add from './Screens/Add/Add'
import List from './Screens/List/List'
import Orders from './Screens/Orders/Orders'
import { ToastContainer} from 'react-toastify';
import './App.css'

const url = 'https://food-prep-backend.onrender.com'

const App = () => {
  
  return (
    <div className='app'>
      <ToastContainer/>
      <Navbar/>
      <hr />
      <div className="app-content">
        <Sidebar/>
        <Routes>
          <Route path='/' element={<Add url={url}/>}/>
          <Route path='/add' element={<Add url={url}/>}/>
          <Route path='/list' element={<List url={url}/>}/>
          <Route path='/orders' element={<Orders url={url}/>}/>
        </Routes>
      </div>
    </div>
  )
}

export default App