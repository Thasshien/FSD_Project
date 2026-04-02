import { useState, useEffect } from "react";
import { assets } from "../../assets/assets";
import axios from "axios";
import "./Add.css";
import { toast } from 'react-toastify';

const categoryGstDefaults = {
  Salad: 5,
  Rolls: 12,
  Deserts: 18,
  Sandwich: 12,
  Cake: 18,
  "Pure Veg": 5,
  Pasta: 12,
  Noodles: 12,
};

const categoryPrepDefaults = {
  Salad: 12,
  Rolls: 18,
  Deserts: 8,
  Sandwich: 15,
  Cake: 35,
  "Pure Veg": 22,
  Pasta: 24,
  Noodles: 20,
};

const Add = ({ url }) => {
  const [image, setImage] = useState(false);
  const dietaryDefaults = {
    containsPeanuts: false,
    containsDairy: false,
    containsGluten: false,
    diabeticFriendly: false,
    vegan: false,
    spicy: false,
  };

  const [data, setData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Salad",
    calories: "",
    sodium: "",
    sugar: "",
    protein: "",
    carbs: "",
    fat: "",
    allergens: "",
    healthTags: "",
    prepTimeMinutes: String(categoryPrepDefaults.Salad),
    gstRate: String(categoryGstDefaults.Salad),
    available: true,
    ...dietaryDefaults,
  });

  const onChangeHandler = (e) => {
    const { name, value, type, checked } = e.target;
    setData((currentData) => ({
      ...currentData,
      ...(name === "category"
        ? {
            gstRate: String(categoryGstDefaults[value] || currentData.gstRate),
            prepTimeMinutes: String(categoryPrepDefaults[value] || currentData.prepTimeMinutes),
          }
        : {}),
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("price", Number(data.price));
    formData.append("category", data.category);
    formData.append("image", image);
    formData.append("prepTimeMinutes", Number(data.prepTimeMinutes));
    formData.append("gstRate", Number(data.gstRate));
    formData.append("available", data.available);
    formData.append(
      "nutrition",
      JSON.stringify({
        calories: Number(data.calories),
        sodium: Number(data.sodium),
        sugar: Number(data.sugar),
        protein: Number(data.protein),
        carbs: Number(data.carbs),
        fat: Number(data.fat),
      })
    );
    formData.append(
      "dietaryInfo",
      JSON.stringify({
        containsPeanuts: data.containsPeanuts,
        containsDairy: data.containsDairy,
        containsGluten: data.containsGluten,
        diabeticFriendly: data.diabeticFriendly,
        vegan: data.vegan,
        spicy: data.spicy,
      })
    );
    formData.append(
      "allergens",
      JSON.stringify(
        data.allergens
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
    formData.append(
      "healthTags",
      JSON.stringify(
        data.healthTags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
    try { 
      const response = await axios.post(`${url}/api/food/add`, formData);
      toast(response.data.message)
      setData({
        name: "",
        description: "",
        price: "",
        category: "Salad",
        calories: "",
        sodium: "",
        sugar: "",
        protein: "",
        carbs: "",
        fat: "",
        allergens: "",
        healthTags: "",
        prepTimeMinutes: String(categoryPrepDefaults.Salad),
        gstRate: String(categoryGstDefaults.Salad),
        available: true,
        ...dietaryDefaults,
      });
      setImage(false)
    } catch (error) {
        console.error(error.message)
    }
  };

  return (
    <div className="screen">
      <div className="container">
        <form onSubmit={onSubmitHandler} className="flex-col">
          <div className="add-img-upload flex-col">
            <p>Upload Image</p>
            <label htmlFor="image">
              <img
                src={image ? URL.createObjectURL(image) : assets.upload_area}
                alt=""
              />
            </label>
            <input
              onChange={(e) => setImage(e.target.files[0])}
              type="file"
              id="image"
              hidden
              required
            />
          </div>
          <div className="add-product-name flex-col">
            <p>Product name</p>
            <input
              value={data.name}
              onChange={onChangeHandler}
              type="text"
              name="name"
              placeholder="Type here"
            />
          </div>
          <div className="add-product-description flex-col">
            <p>Product Description</p>
            <textarea
              value={data.description}
              onChange={onChangeHandler}
              name="description"
              rows="6"
              placeholder="Write content here"
              required
            ></textarea>
          </div>
          <div className="add-category-price">
            <div className="add-category flex-col">
              <p>Category</p>
              <select
                value={data.category}
                onChange={onChangeHandler}
                name="category"
                id=""
              >
                <option value="Salad">Salad</option>
                <option value="Rolls">Rolls</option>
                <option value="Deserts">Deserts</option>
                <option value="Sandwich">Sandwich</option>
                <option value="Cake">Cake</option>
                <option value="Pure Veg">Pure Veg</option>
                <option value="Pasta">Pasta</option>
                <option value="Noodles">Noodles</option>
              </select>
            </div>
            <div className="add-price flex-col">
              <p>Price</p>
              <input
                value={data.price}
                onChange={onChangeHandler}
                type="Number"
                name="price"
                placeholder="₹150"
                required
              />
            </div>
          </div>
          <div className="add-nutrition-grid">
            <div className="flex-col">
              <p>Prep time (mins)</p>
              <input
                value={data.prepTimeMinutes}
                onChange={onChangeHandler}
                type="number"
                name="prepTimeMinutes"
                placeholder={String(categoryPrepDefaults[data.category] || 25)}
                required
              />
            </div>
            <div className="flex-col">
              <p>GST rate (%)</p>
              <input
                value={data.gstRate}
                type="number"
                name="gstRate"
                placeholder={String(categoryGstDefaults[data.category] || 12)}
                readOnly
                required
              />
              <small>Auto-set from product category</small>
            </div>
            <label className="add-toggle">
              <input
                type="checkbox"
                name="available"
                checked={data.available}
                onChange={onChangeHandler}
              />
              Available for ordering
            </label>
          </div>
          <div className="add-nutrition-grid">
            <div className="flex-col">
              <p>Calories</p>
              <input
                value={data.calories}
                onChange={onChangeHandler}
                type="number"
                name="calories"
                placeholder="250"
                required
              />
            </div>
            <div className="flex-col">
              <p>Sodium (mg)</p>
              <input
                value={data.sodium}
                onChange={onChangeHandler}
                type="number"
                name="sodium"
                placeholder="320"
                required
              />
            </div>
            <div className="flex-col">
              <p>Sugar (g)</p>
              <input
                value={data.sugar}
                onChange={onChangeHandler}
                type="number"
                name="sugar"
                placeholder="12"
                required
              />
            </div>
            <div className="flex-col">
              <p>Protein (g)</p>
              <input
                value={data.protein}
                onChange={onChangeHandler}
                type="number"
                name="protein"
                placeholder="8"
                required
              />
            </div>
            <div className="flex-col">
              <p>Carbs (g)</p>
              <input
                value={data.carbs}
                onChange={onChangeHandler}
                type="number"
                name="carbs"
                placeholder="28"
                required
              />
            </div>
            <div className="flex-col">
              <p>Fat (g)</p>
              <input
                value={data.fat}
                onChange={onChangeHandler}
                type="number"
                name="fat"
                placeholder="9"
                required
              />
            </div>
          </div>
          <div className="add-product-name flex-col">
            <p>Allergens</p>
            <input
              value={data.allergens}
              onChange={onChangeHandler}
              type="text"
              name="allergens"
              placeholder="Peanuts, Dairy, Sesame"
            />
          </div>
          <div className="add-product-name flex-col">
            <p>Health tags</p>
            <input
              value={data.healthTags}
              onChange={onChangeHandler}
              type="text"
              name="healthTags"
              placeholder="Low sodium, High protein, Diabetes friendly"
            />
          </div>
          <div className="add-dietary-section flex-col">
            <p>Dietary flags</p>
            <div className="add-dietary-grid">
              <label>
                <input
                  type="checkbox"
                  name="containsPeanuts"
                  checked={data.containsPeanuts}
                  onChange={onChangeHandler}
                />
                Contains peanuts
              </label>
              <label>
                <input
                  type="checkbox"
                  name="containsDairy"
                  checked={data.containsDairy}
                  onChange={onChangeHandler}
                />
                Contains dairy
              </label>
              <label>
                <input
                  type="checkbox"
                  name="containsGluten"
                  checked={data.containsGluten}
                  onChange={onChangeHandler}
                />
                Contains gluten
              </label>
              <label>
                <input
                  type="checkbox"
                  name="diabeticFriendly"
                  checked={data.diabeticFriendly}
                  onChange={onChangeHandler}
                />
                Diabetic friendly
              </label>
              <label>
                <input
                  type="checkbox"
                  name="vegan"
                  checked={data.vegan}
                  onChange={onChangeHandler}
                />
                Vegan
              </label>
              <label>
                <input
                  type="checkbox"
                  name="spicy"
                  checked={data.spicy}
                  onChange={onChangeHandler}
                />
                Spicy
              </label>
            </div>
          </div>
          <button type="submit" className="add-btn">
            ADD
          </button>
        </form>
      </div>
    </div>
  );
};

export default Add;
