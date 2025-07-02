import { createContext,useState,useEffect } from "react";
import axios from 'axios'
export const Store_Context = createContext();
const Store_Context_Provider = ({children})=>{
    const [cartItems,setCartItems] = useState({})
    const [food_list,setFoodList] = useState([])
    const url = 'https://food-prep-backend.onrender.com'
    const [token,setToken] = useState("")

    const fetchFoodList = async()=>{
        const response = await axios.get(url+'/api/food/list')
        setFoodList(response.data.data)
    }

    useEffect(()=>{
        async function loadData(){
            await fetchFoodList()
            if(localStorage.getItem("token")){
                setToken(localStorage.getItem("token")) 
                await loadCartData(localStorage.getItem("token"))       
            }
        }
        loadData()
    },[])
    
    const loadCartData = async(token)=>{
        const response = await axios.get(url+"/api/cart/get",{headers:{token}})
        setCartItems(response.data.cartData)
    }

    const addToCart=async(itemId)=>{
        if(!cartItems[itemId])
            setCartItems({...cartItems,[itemId]:1})
        else
            setCartItems({...cartItems,[itemId]:cartItems[itemId]+1})

        if(token){
            try {
                await axios.post(url+"/api/cart/add",{itemId},{headers:{token}})
            } catch (error) {
                console.log(error)
            }
        }
    }

    const removeFromCart=async(itemId)=>{
        setCartItems({...cartItems,[itemId]:cartItems[itemId]-1})

        if(token){
            try {
                await axios.delete(`${url}/api/cart/remove?itemId=${itemId}`,{headers:{token}})
            } catch (error) {
                console.log(error)
            }
        }
    }

    const getTotalCartAmount=()=>{
        let total=0;
        for(let eltId in cartItems ){
            if(cartItems[eltId]>0){
                let itemInfo = food_list.find(food=>food._id==eltId)
                total+=itemInfo.price * cartItems[eltId]
            }
        }
        return total;
    }

    const contextValue={
        cartItems,
        setCartItems,
        food_list,
        addToCart,
        removeFromCart,
        getTotalCartAmount,
        url,
        token,
        setToken
    }
    return(
        <Store_Context.Provider value={contextValue}>
            {children}
        </Store_Context.Provider>
    )
}

export default Store_Context_Provider