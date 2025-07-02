import React from "react"
import { useEffect,useContext } from "react";
import { Store_Context } from "../../context/Store_Context";
import "./Food_Card.css"
import { assets } from "../../assets/assets"
import Food_Display from "../Food_Display/Food_Display"

const Food_Card = ({id,name,price,description,image}) => {
    const {cartItems,setCartItems,addToCart,removeFromCart,url } = useContext(Store_Context);


    return (
        <div className='Food_Item'> 
            <div className="Food_Item_image_container">
                <img className='Food_Item_image' src={`${url}/image/${image}`} alt="" />
                {
                !cartItems[id]
                    ? <img className='add' onClick={()=>addToCart(id)} src={assets.add_icon_white} alt="" />
                    : <div className="Food_Item_counter">
                        <img onClick={()=>removeFromCart(id)} src={assets.remove_icon_red} alt="" />
                        <p className='Food_count'>{cartItems[id]}</p>
                        <img onClick={()=>addToCart(id)} src={assets.add_icon_green} alt="" />
                    </div>
                }
            </div>

            <div className="Food_Item_info">
                <p className='Food_Item_name'>{name}</p>
                <p className='Food_Item_desc'>{description}</p>
                <div className="Food_Item_price_rating">
                    <p className='Food_Item_price'>₹{price}</p>
                    <img src={assets.rating_starts} alt="" />
                </div>
            </div>  
        </div>
    )
}

export default Food_Card    