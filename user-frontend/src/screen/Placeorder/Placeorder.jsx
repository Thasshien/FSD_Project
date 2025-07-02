import {useContext,useState,useEffect} from 'react'
import './PlaceOrder.css'
import {Store_Context} from '../../context/Store_Context'
import axios from 'axios'
import {useNavigate} from 'react-router-dom'

const PlaceOrder = () => {

  const [data,setData] = useState({
    first_name:"",
    last_name:"",
    email:"",
    street:"",
    city:"",
    state:"",
    zip_code:"",
    country:"",
    phone:""
  })

  const {getTotalCartAmount,food_list,cartItems,url,token} = useContext(Store_Context);

  const onChangeHandler=(e)=>{
    const {name,value} = e.target
    setData({...data,[name]:value})
  }

  const onSubmitHandler =async(e)=>{
    e.preventDefault();
    let orderItem=[];
    food_list.map((item)=>{
      if(cartItems[item._id]>0){
        let itemInfo = {...item};
        itemInfo.quantity = cartItems[item._id]
        orderItem.push(itemInfo)
      }
    })
    let orderData = {
      address:data,
      items:orderItem,
      amount:getTotalCartAmount()+20
    }
    
    try {
      let response = await axios.post(url+"/api/order/place",orderData,{headers:{token}})
      const {session_url} = response.data
      window.location.replace(session_url)
    } catch (error) {
      console.log(error)
    }
  }

  const navigate = useNavigate()

  useEffect(()=>{
    if(!token){
      navigate('/cart')
    }
    else if(getTotalCartAmount()===0)
      navigate('/cart')
  },[token])

  return (
    <form onSubmit={onSubmitHandler} className='place-order'>
      <div className="place-order-left">
        <p className='title'>Delivery Information</p>
        <div className="multi-fields">
          <input required name="first_name" value={data.first_name} onChange={onChangeHandler} type="text" placeholder='First Name'/>
          <input required name="last_name" value={data.last_name} onChange={onChangeHandler} type="text" placeholder='Last Name'/>
        </div>
        <input required name="email" value={data.email} onChange={onChangeHandler}  type="email" placeholder='Email address'/>
        <input required name="street" value={data.street} onChange={onChangeHandler}  type="text" placeholder='Street'/>
        <div className="multi-fields">
          <input required name="city" value={data.city} onChange={onChangeHandler}  type="text" placeholder='City'/>
          <input required name="state" value={data.state} onChange={onChangeHandler}  type="text" placeholder='State'/>
        </div>
        <div className="multi-fields">
          <input required name="zip_code" value={data.zip_code} onChange={onChangeHandler}  type="text" placeholder='Zip code'/>
          <input required name="country" value={data.country} onChange={onChangeHandler}  type="text" placeholder='Country'/>
        </div>
        <input required name="phone" value={data.phone} onChange={onChangeHandler}  type="text" placeholder='Phone'/>
      </div>
      <div className="place-order-right">
      <div className="cart-total">
          <h2>Cart Totals</h2>
          <div>
            <div className="cart-total-details">
              <p>Subtotal</p>
              <p>₹{getTotalCartAmount()}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Delivery Fee</p>
              <p>₹{20}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Total</p>
              <p>₹{getTotalCartAmount()+20}</p>
            </div>
          </div>
          <button type='submit'>Proceed to Payment</button>
        </div>
      </div>
    </form>
  )
}

export default PlaceOrder