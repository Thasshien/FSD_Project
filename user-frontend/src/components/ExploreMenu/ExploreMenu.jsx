import React from 'react'
import './ExploreMenu.css'
import {menu_list} from '../../assets/assets'

const ExploreMenu = ({category,setCategory}) => {
  return (
    <div className='ExploreMenu'> 
      <hr />
      <h1>Explore our menu</h1>
      <p className='ExploreMenu_text'>Choose from a diverse menu featuring a delectable array of dishes. Our mission is to satisfy your cravings and elevate your dining experience, one delicious meal at a time.</p>
      <div className="ExploreMenu_list">
        {
          menu_list.map((item,index)=>{
            return(
              <div onClick={()=>setCategory(category===item.menu_name?"All":item.menu_name)} key={index} className="ExploreMenu_list_item">
                <img className={category===item.menu_name?"active":""} src={item.menu_image} alt="" />
                <p>{item.menu_name}</p>
              </div>
            )
          })
        }
      </div>
      <hr />
    </div>
  )
}

export default ExploreMenu