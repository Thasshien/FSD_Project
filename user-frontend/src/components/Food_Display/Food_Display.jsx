import { useContext, useEffect, useMemo, useState } from "react";
import "./Food_Display.css";
import { Store_Context } from "../../context/Store_Context";
import Food_Card from "../Food_Card/Food_Card";

const pricePresets = [
  { label: "All Prices", value: "all" },
  { label: "Under 200", value: "200" },
  { label: "Under 300", value: "300" },
  { label: "Under 500", value: "500" },
];

const nutritionFilters = [
  { label: "Low sodium", key: "lowSodium" },
  { label: "Peanut free", key: "peanutFree" },
  { label: "Diabetic friendly", key: "diabeticFriendly" },
  { label: "Previously ordered", key: "previouslyOrdered" },
];

const formatNutritionValue = (value, unit) => {
  const numericValue = Number(value);
  return numericValue > 0 ? `${numericValue} ${unit}` : "Not added";
};

const Food_Display = ({ category }) => {
  const {
    food_list,
    previouslyOrderedItemIds,
    cartItems,
    addToCart,
    removeFromCart,
    getFoodImageSrc,
  } =
    useContext(Store_Context);
  const [selectedPrice, setSelectedPrice] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const hasCalorieData = useMemo(
    () => food_list.some((item) => Number(item.nutrition?.calories || 0) > 0),
    [food_list]
  );
  const maxCaloriesAvailable = useMemo(() => {
    const caloriesList = food_list
      .map((item) => Number(item.nutrition?.calories || 0))
      .filter((value) => value > 0);

    return caloriesList.length ? Math.max(...caloriesList) : 600;
  }, [food_list]);
  const minCaloriesAvailable = maxCaloriesAvailable >= 100 ? 100 : 0;
  const [calorieLimit, setCalorieLimit] = useState(600);
  const [advancedFilters, setAdvancedFilters] = useState({
    lowSodium: false,
    peanutFree: false,
    diabeticFriendly: false,
    previouslyOrdered: false,
  });

  useEffect(() => {
    setCalorieLimit(maxCaloriesAvailable);
  }, [maxCaloriesAvailable]);

  const filteredItems = useMemo(() => {
    return food_list.filter((item) => {
      const categoryMatch = category === "All" || category === item.category;
      if (!categoryMatch) return false;

      const priceMatch =
        selectedPrice === "all" || Number(item.price) <= Number(selectedPrice);
      if (!priceMatch) return false;

      const nutrition = item.nutrition || {};
      const dietaryInfo = item.dietaryInfo || {};
      const isPreviouslyOrdered = previouslyOrderedItemIds.includes(String(item._id));
      const calories = Number(nutrition.calories || 0);

      if (
        hasCalorieData &&
        calorieLimit < maxCaloriesAvailable &&
        calories > 0 &&
        calories > calorieLimit
      ) {
        return false;
      }

      if (advancedFilters.lowSodium && Number(nutrition.sodium || 0) > 400) {
        return false;
      }

      if (advancedFilters.peanutFree && dietaryInfo.containsPeanuts) {
        return false;
      }

      if (advancedFilters.diabeticFriendly && !dietaryInfo.diabeticFriendly) {
        return false;
      }

      if (advancedFilters.previouslyOrdered && !isPreviouslyOrdered) {
        return false;
      }

      return true;
    });
  }, [
    advancedFilters,
    calorieLimit,
    category,
    food_list,
    hasCalorieData,
    maxCaloriesAvailable,
    previouslyOrderedItemIds,
    selectedPrice,
  ]);

  const toggleFilter = (filterKey) => {
    setAdvancedFilters((currentFilters) => ({
      ...currentFilters,
      [filterKey]: !currentFilters[filterKey],
    }));
  };

  return (
    <div className="Food_Display" id="Food_Display">
      <div className="Food_Display_header">
        <div>
          <h2>Top dishes near you</h2>
          <p>Open any dish for a polished quick-view with nutrition details and faster reordering.</p>
        </div>
        <span className="Food_Display_count">{filteredItems.length} items</span>
      </div>

      <div className="Food_Display_filters">
        <div className="Food_Display_filter_group">
          {pricePresets.map((pricePreset) => (
            <button
              key={pricePreset.value}
              type="button"
              className={selectedPrice === pricePreset.value ? "active" : ""}
              onClick={() => setSelectedPrice(pricePreset.value)}
            >
              {pricePreset.label}
            </button>
          ))}
        </div>

        <div className="Food_Display_range_filter">
          <div className="Food_Display_range_filter_text">
            <strong>Calorie range</strong>
            <span>
              {hasCalorieData
                ? `Up to ${calorieLimit} kcal${calorieLimit === maxCaloriesAvailable ? " (all items)" : ""}`
                : "Nutrition data not available from API yet"}
            </span>
          </div>
          <input
            type="range"
            min={minCaloriesAvailable}
            max={maxCaloriesAvailable}
            step="10"
            value={Math.min(calorieLimit, maxCaloriesAvailable)}
            onChange={(event) => setCalorieLimit(Number(event.target.value))}
            disabled={!hasCalorieData}
          />
        </div>

        <div className="Food_Display_filter_group Food_Display_filter_group_secondary">
          {nutritionFilters.map((filterOption) => (
            <button
              key={filterOption.key}
              type="button"
              className={advancedFilters[filterOption.key] ? "active secondary" : "secondary"}
              onClick={() => toggleFilter(filterOption.key)}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      <div className="Food_Display_list">
        {filteredItems.map((item) => (
          <Food_Card
            key={item._id}
            {...item}
            id={item._id}
            isPreviouslyOrdered={previouslyOrderedItemIds.includes(String(item._id))}
            onOpen={() => setSelectedItem(item)}
          />
        ))}
      </div>

      {!filteredItems.length ? (
        <div className="Food_Display_empty">
          No dishes match these filters right now. Try clearing one nutrition filter or widening the price range.
        </div>
      ) : null}

      {selectedItem ? (
        <div className="Food_Display_modal_backdrop" onClick={() => setSelectedItem(null)}>
          <div className="Food_Display_modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="Food_Display_modal_close"
              onClick={() => setSelectedItem(null)}
            >
              x
            </button>

            <div className="Food_Display_modal_image_wrap">
              <img
                src={getFoodImageSrc(selectedItem)}
                alt={selectedItem.name}
                className="Food_Display_modal_image"
              />
              {previouslyOrderedItemIds.includes(String(selectedItem._id)) ? (
                <span className="Food_Display_modal_badge">Previously ordered</span>
              ) : null}
            </div>

            <div className="Food_Display_modal_content">
              <div className="Food_Display_modal_header">
                <div>
                  <h3>{selectedItem.name}</h3>
                  <p>{selectedItem.description}</p>
                </div>
                <div className="Food_Display_modal_price">Rs {selectedItem.price}</div>
              </div>

              <div className="Food_Display_modal_stats">
                <div>
                  <span>Calories</span>
                  <strong>{formatNutritionValue(selectedItem.nutrition?.calories, "kcal")}</strong>
                </div>
                <div>
                  <span>Sodium</span>
                  <strong>{formatNutritionValue(selectedItem.nutrition?.sodium, "mg")}</strong>
                </div>
                <div>
                  <span>Sugar</span>
                  <strong>{formatNutritionValue(selectedItem.nutrition?.sugar, "g")}</strong>
                </div>
                <div>
                  <span>Protein</span>
                  <strong>{formatNutritionValue(selectedItem.nutrition?.protein, "g")}</strong>
                </div>
                <div>
                  <span>Carbs</span>
                  <strong>{formatNutritionValue(selectedItem.nutrition?.carbs, "g")}</strong>
                </div>
                <div>
                  <span>Fat</span>
                  <strong>{formatNutritionValue(selectedItem.nutrition?.fat, "g")}</strong>
                </div>
                <div>
                  <span>Prep time</span>
                  <strong>{selectedItem.prepTimeMinutes || 25} mins</strong>
                </div>
                <div>
                  <span>GST</span>
                  <strong>{selectedItem.gstRate || 12}%</strong>
                </div>
              </div>

              <div className="Food_Display_modal_section">
                <h4>Dietary details</h4>
                <div className="Food_Display_modal_tags">
                  <span>
                    {selectedItem.available === false || Number(selectedItem.stock ?? 0) <= 0
                      ? "Currently unavailable"
                      : "Available to order"}
                  </span>
                  <span>
                    {selectedItem.dietaryInfo?.containsPeanuts ? "Contains peanuts" : "Peanut free"}
                  </span>
                  <span>
                    {selectedItem.dietaryInfo?.containsDairy ? "Contains dairy" : "Dairy free"}
                  </span>
                  <span>
                    {selectedItem.dietaryInfo?.containsGluten ? "Contains gluten" : "Gluten free"}
                  </span>
                  {selectedItem.dietaryInfo?.diabeticFriendly ? <span>Diabetic friendly</span> : null}
                  {selectedItem.dietaryInfo?.vegan ? <span>Vegan</span> : null}
                  {selectedItem.dietaryInfo?.spicy ? <span>Spicy</span> : null}
                </div>
              </div>

              <div className="Food_Display_modal_section">
                <h4>Allergens</h4>
                <p>
                  {(selectedItem.allergens || []).length
                    ? selectedItem.allergens.join(", ")
                    : "No major allergens listed"}
                </p>
              </div>

              {(selectedItem.healthTags || []).length ? (
                <div className="Food_Display_modal_section">
                  <h4>Health tags</h4>
                  <div className="Food_Display_modal_tags">
                    {selectedItem.healthTags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="Food_Display_modal_actions">
                {selectedItem.available === false || Number(selectedItem.stock ?? 0) <= 0 ? (
                  <button type="button" disabled>
                    Unavailable right now
                  </button>
                ) : !cartItems[selectedItem._id] ? (
                  <button type="button" onClick={() => addToCart(selectedItem._id)}>
                    Add to cart
                  </button>
                ) : (
                  <div className="Food_Display_modal_counter">
                    <button type="button" onClick={() => removeFromCart(selectedItem._id)}>
                      -
                    </button>
                    <span>{cartItems[selectedItem._id]}</span>
                    <button type="button" onClick={() => addToCart(selectedItem._id)}>
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Food_Display;
