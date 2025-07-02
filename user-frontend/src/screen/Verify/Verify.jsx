import {useContext,useEffect} from 'react'
import './Verify.css'
import axios from 'axios'
import {Store_Context} from '../../context/Store_Context'
import {useSearchParams,useNavigate} from 'react-router-dom'
import Loader from '../../components/Loader/Loader'

const Verify = () => {

    const [searachParams,setSearchParams] = useSearchParams()

    const success = searachParams.get("success")
    const orderId = searachParams.get("orderId")

    const navigate = useNavigate()

    console.log(success,orderId)
    const {url} =useContext(StoreContext)

    const verifyPayment = async()=>{
        try { 
            const response = await axios.post(url+"/api/order/verify",{success,orderId})
            if(response.data.message==='Not paid')
                navigate('/')//res
            else
                navigate('/myorders')
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(()=>{
        verifyPayment()
    },[])

  return (
    <Loader/>
  )
}

export default Verify