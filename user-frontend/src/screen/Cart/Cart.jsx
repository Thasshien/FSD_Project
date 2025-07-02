import { useContext } from "react";
import "./Cart.css";
import { Store_Context } from "../../context/Store_Context";
import { assets } from "../../assets/assets";
import {useNavigate} from 'react-router-dom'
import { toast, ToastContainer } from "react-toastify";

const Cart = () => {
  const { cartItems, food_list, addToCart, removeFromCart,getTotalCartAmount,url,token } = useContext(Store_Context);
  const navigate = useNavigate();
  const handleCheckout = () => {
  if (!token) {
    toast.error("Please login to proceed to checkout!", {
      position: "bottom-right",
      draggable: true,
      autoClose: 3000,
    });
    return;
  }
  if (getTotalCartAmount() === 0) {
    toast.error("Your cart is empty!", {
      position: "bottom-right",
      draggable: true,
      autoClose: 3000,
    });
    return;
  }
  navigate('/order');
};

  return (
    <div className="cart">
      <div className="cart-items">
        <div className="cart-items-title">
          <p>Items</p>
          <p>Title</p>
          <p>Price</p>
          <p>Quantity</p>
          <p>Total</p>
          <p>Modify</p>
        </div>
        <br />
        <hr />
        {food_list.map((food, index) => {
        if (cartItems[food._id] > 0) {
          return (
            <>
              <div className="cart-items-title cart-items-item">
                <img className="food-image" src={`${url}/image/${food.image}`} alt="" />
                <p>{food.name}</p>
                <p>{food.price}</p>
                <p>{cartItems[food._id]}</p>
                <p>{cartItems[food._id] * food.price}</p>
                <div className="cart-counter food-item-counter">
                  <img
                    onClick={() => removeFromCart(food._id)}
                    src={assets.remove_icon_red}
                    alt=""
                  />
                  <p >{cartItems[food._id]}</p>
                  <img
                    onClick={() => addToCart(food._id)}
                    src={assets.add_icon_green}
                    alt=""
                  />
                </div>
              </div>
              <hr />
            </>
          );
        }
      })}
      </div>

      <div className="cart-bottom">
        <div className="cart-total">
          <h2>Cart Totals</h2>
          <div>
            <div className="cart-total-details">
              <p>Subtotal</p>
              <p>{getTotalCartAmount()}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Delivery Fee</p>
              <p>{20}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Total</p>
              <p>{getTotalCartAmount()+20}</p>
            </div>
          </div>
          <button className="cart-checkout-button" onClick={()=>handleCheckout()}>Proceed to Checkout</button>
          <ToastContainer theme="dark"/>
        </div>
        <div className="cart-promocode">
          <p>If you have a promo code, Enter it here</p>
          <div className="cart-promocode-input">
            <input type="text" placeholder="Enter promo code" />
            <button>Apply</button>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default Cart;