import React from "react"
import "./Header.css"
import { useNavigate } from "react-router-dom"

const Header = ({onExploreClick}) => {
    const Navigate = useNavigate();
    return (
        <div className="Header">
            <div className="Header_content">
                <h2>Order your favourite food here</h2>
                <p>Order food online from your favourite restaurants</p>
                <button onClick={onExploreClick}>View Menu</button>
            </div>
        </div>
    )
}   

export default Header