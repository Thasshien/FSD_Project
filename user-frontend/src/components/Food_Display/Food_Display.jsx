import {useContext} from 'react'
import './Food_Display.css'
import {Store_Context} from '../../context/Store_Context'
import Food_Card from '../Food_Card/Food_Card'

const Food_Display = ({category}) => {

  const {food_list} = useContext(Store_Context)

  return (
    <div className='Food_Display' id='Food_Display'> 
      <h2>Top dishes near you</h2>
      <div className="Food_Display_list">
        {
          food_list.map((item,index)=>{
            if(category=='All' || category===item.category)
                return <Food_Card key={index} id={item._id} name={item.name} image={item.image} price={item.price} description={item.description}/>
          })
        }
      </div>
    </div>
  )
}

export default Food_Display