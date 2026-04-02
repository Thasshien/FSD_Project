import { useContext } from "react";
import "./Cart.css";
import { Store_Context } from "../../context/Store_Context";
import { assets } from "../../assets/assets";
import {useNavigate} from 'react-router-dom'
import { toast, ToastContainer } from "react-toastify";

const Cart = () => {
  const { cartItems, food_list, addToCart, removeFromCart, getTotalCartAmount, token, getFoodImageSrc } =
    useContext(Store_Context);
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
          <p>Quantity</p>
          <p>Modify</p>
        </div>
        <br />
        <hr />
        {food_list.map((food) => {
        if (cartItems[food._id] > 0) {
          return (
            <div key={food._id}>
              <div className="cart-items-title cart-items-item">
                <img className="food-image" src={getFoodImageSrc(food)} alt="" />
                <p>{food.name}</p>
                <p>{cartItems[food._id]}</p>
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
              {food.available === false || Number(food.stock ?? 0) <= 0 ? (
                <p className="cart-item-warning">This item is currently unavailable and must be removed before checkout.</p>
              ) : null}
              <hr />
            </div>
          );
        }
      })}
      </div>

      <div className="cart-bottom">
        <div className="cart-total cart-checkout-panel">
          <h2>Ready for checkout?</h2>
          <p className="cart-checkout-note">
            Final delivery charges, GST, ETA, and the `SAVE10` promo code are applied only after you enter delivery information.
          </p>
          <button className="cart-checkout-button" onClick={()=>handleCheckout()}>Proceed to Checkout</button>
          <ToastContainer theme="dark"/>
        </div>
        <div className="cart-promocode cart-summary-note">
          <p>Items in cart: {Object.values(cartItems).reduce((total, count) => total + (count || 0), 0)}</p>
          <p>Price details are shown on the delivery information page only.</p>
        </div>
      </div>
      
    </div>
  );
};

export default Cart;
