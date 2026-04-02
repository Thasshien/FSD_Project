import React, { useContext } from "react";
import { Store_Context } from "../../context/Store_Context";
import "./Food_Card.css";
import { assets } from "../../assets/assets";

const Food_Card = ({
  id,
  name,
  price,
  description,
  image,
  localImage,
  stock,
  available,
  prepTimeMinutes,
  dietaryInfo,
  healthTags,
  isPreviouslyOrdered,
  onOpen,
}) => {
  const { cartItems, addToCart, removeFromCart, getFoodImageSrc } = useContext(Store_Context);
  const imageSrc = getFoodImageSrc({ image, localImage });
  const canOrder = available !== false && Number(stock ?? 0) > 0;

  const safeDietaryInfo = dietaryInfo || {};
  const visibleHighlights = Array.from(
    new Set([
    safeDietaryInfo.diabeticFriendly ? "Diabetic friendly" : null,
    safeDietaryInfo.vegan ? "Vegan" : null,
    safeDietaryInfo.spicy ? "Spicy" : null,
    ...((healthTags || []).slice(0, 2)),
    ].filter(Boolean))
  );

  const handleCartClick = (event, action) => {
    event.stopPropagation();
    action();
  };

  return (
    <div
      className="Food_Item"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="Food_Item_image_container">
        <img className="Food_Item_image" src={imageSrc} alt={name} />
        {!canOrder ? (
          <span className="Food_Item_badge Food_Item_badge_warning">Unavailable</span>
        ) : null}
        {isPreviouslyOrdered ? <span className="Food_Item_badge">Ordered before</span> : null}
        {!cartItems[id] ? (
          <img
            className={`add ${!canOrder ? "disabled" : ""}`}
            onClick={(event) => (canOrder ? handleCartClick(event, () => addToCart(id)) : event.stopPropagation())}
            src={assets.add_icon_white}
            alt="Add item"
          />
        ) : (
          <div className="Food_Item_counter" onClick={(event) => event.stopPropagation()}>
            <img onClick={() => removeFromCart(id)} src={assets.remove_icon_red} alt="Remove item" />
            <p className="Food_count">{cartItems[id]}</p>
            <img onClick={() => addToCart(id)} src={assets.add_icon_green} alt="Add item" />
          </div>
        )}
      </div>

      <div className="Food_Item_info">
        <div className="Food_Item_heading">
          <div>
            <p className="Food_Item_name">{name}</p>
            <p className="Food_Item_desc">{description}</p>
          </div>
          <img src={assets.rating_starts} alt="" />
        </div>

        <div className="Food_Item_price_row">
          <p className="Food_Item_price">Rs {price}</p>
          <p className="Food_Item_quick_meta">{prepTimeMinutes || 25} mins prep</p>
          <button
            type="button"
            className="Food_Item_view_button"
            onClick={(event) => handleCartClick(event, onOpen)}
          >
            View details
          </button>
        </div>

        {visibleHighlights.length ? (
          <div className="Food_Item_tags">
            {visibleHighlights.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Food_Card;
