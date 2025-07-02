import './Home.css'
import Header from '../../components/Header/Header'
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu'
import {useState,useEffect} from "react"
import { useRef } from 'react'
import Food_Display from '../../components/Food_Display/Food_Display'

const Home = () => {
  const [category, setCategory]= useState("All")
  const exploreRef = useRef(null);
  
    const handleExploreScroll = () => {
      exploreRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
  return (
    <div className='home'>
      <Header onExploreClick = {handleExploreScroll}/>
      <ExploreMenu category={category} setCategory={setCategory}/>
      <div ref={exploreRef} className='explore-menu'>
        <Food_Display category={category}/>
      </div>
    </div>
  )
}

export default Home