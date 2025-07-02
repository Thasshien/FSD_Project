import React from 'react'
import './Footer.css'
import {assets} from '../../assets/assets'

const Footer = () => {
  return (
    <div className='footer' id='footer'>
      <div className="footer-content">
        <div className="footer-content-left">
          <img className='footer-logo' src={assets.logo_bottom} alt="" />
          <p>FoodPrep is a full-stack web application designed to help users discover, order, and enjoy delicious meals online. Built as a hands-on learning project, FoodPrep demonstrates modern web development practices and provides a seamless food ordering experience for students and food lovers alike.</p>
          <div className="footer-social-icons">
            <img src={assets.facebook_icon} alt="" />
            <img src={assets.twitter_icon} alt="" />
            <img src={assets.linkedin_icon} alt="" />
          </div>
        </div>
        <div className="footer-content-center">
          <h2>Company</h2>
          <ul>
            <li>Home</li>
            <li>About us</li>
            <li>Reviews</li>
          </ul>
        </div>
        <div className="footer-content-right">
          <h2>Get in touch</h2>
          <ul>
            <li>+91 96001 71014</li>
            <li><a href="mailto:thasshien.gr2024@vitstudent.ac.in">thasshien.gr2024@vitstudent.ac.in</a></li>
          </ul>
        </div>
      </div>
      <hr className="footer-hr" />
      <p className='footer-copyright'>Copyright © 2024 FoodPrep. All rights reserved.</p>
    </div>
  )
}

export default Footer