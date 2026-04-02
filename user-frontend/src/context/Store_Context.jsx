import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { normalizeFoodItem } from "../utils/foodDataFallback";
import { food_list as fallbackFoodList } from "../assets/assets";

export const Store_Context = createContext();

const Store_Context_Provider = ({ children }) => {
  const [cartItems, setCartItems] = useState({});
  const [food_list, setFoodList] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [restaurantSettings, setRestaurantSettings] = useState({
    restaurantName: "Food Prep",
    opensAtHour: 10,
    closesAtHour: 22,
    lowStockThreshold: 3,
  });
  const url = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const [token, setToken] = useState("");

  const fetchFoodList = async () => {
    try {
      const response = await axios.get(url + "/api/food/list");
      const apiFoodList = response.data.data || [];

      if (apiFoodList.length) {
        setFoodList(apiFoodList.map(normalizeFoodItem));
        return;
      }

      setFoodList(
        fallbackFoodList.map((item) =>
          normalizeFoodItem({ ...item, localImage: true, _id: String(item._id) })
        )
      );
    } catch (error) {
      console.log("error loading food list", error);
      setFoodList(
        fallbackFoodList.map((item) =>
          normalizeFoodItem({ ...item, localImage: true, _id: String(item._id) })
        )
      );
    }
  };

  const loadCartData = async (activeToken) => {
    try {
      const response = await axios.get(url + "/api/cart/get", { headers: { token: activeToken } });
      setCartItems(response.data.cartData);
    } catch (error) {
      console.log("error loading cart", error);
      setCartItems({});

      if (error.response?.status === 401 || error.response?.status === 404) {
        localStorage.removeItem("token");
        setToken("");
      }
    }
  };

  const fetchRestaurantSettings = async () => {
    try {
      const response = await axios.get(`${url}/api/settings`);
      setRestaurantSettings(response.data.data || restaurantSettings);
    } catch (error) {
      console.log("error loading settings", error);
    }
  };

  const fetchUserOrders = async (activeToken = token) => {
    if (!activeToken) {
      setUserOrders([]);
      return [];
    }

    try {
      const response = await axios.get(`${url}/api/order/userorders`, {
        headers: { token: activeToken },
      });
      const orders = response.data.data || [];
      setUserOrders(orders);
      return orders;
    } catch (error) {
      console.log("error fetching orders", error);
      if (error.response?.status === 401 || error.response?.status === 404) {
        localStorage.removeItem("token");
        setToken("");
      }
      return [];
    }
  };

  useEffect(() => {
    async function loadData() {
      await fetchFoodList();
      await fetchRestaurantSettings();
      const savedToken = localStorage.getItem("token");
      if (savedToken) {
        setToken(savedToken);
        await loadCartData(savedToken);
        await fetchUserOrders(savedToken);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserOrders(token);
    } else {
      setUserOrders([]);
    }
  }, [token]);

  const getFoodImageSrc = (food) => (food?.localImage ? food.image : `${url}/image/${food?.image}`);

  const getCartOrderItems = () =>
    food_list
      .filter((item) => cartItems[item._id] > 0)
      .map((item) => ({
        _id: item._id,
        id: item._id,
        name: item.name,
        price: item.price,
        category: item.category,
        image: item.image,
        localImage: Boolean(item.localImage),
        available: item.available,
        stock: item.stock,
        prepTimeMinutes: item.prepTimeMinutes,
        gstRate: item.gstRate,
        quantity: cartItems[item._id],
      }));

  const getCheckoutQuote = async (address, activeToken = token) => {
    if (!activeToken) return null;

    try {
      const response = await axios.post(
        `${url}/api/order/quote`,
        {
          address,
          items: getCartOrderItems(),
        },
        { headers: { token: activeToken } }
      );

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  const addToCart = async (itemId) => {
    const item = food_list.find((food) => String(food._id) === String(itemId));
    if (item?.available === false || Number(item?.stock ?? 0) <= (cartItems[itemId] || 0)) {
      return;
    }

    setCartItems((currentCartItems) => ({
      ...currentCartItems,
      [itemId]: (currentCartItems[itemId] || 0) + 1,
    }));

    if (token && !item?.localImage) {
      try {
        await axios.post(url + "/api/cart/add", { itemId }, { headers: { token } });
      } catch (error) {
        console.log(error);
        setCartItems((currentCartItems) => ({
          ...currentCartItems,
          [itemId]: Math.max((currentCartItems[itemId] || 1) - 1, 0),
        }));
      }
    }
  };

  const removeFromCart = async (itemId) => {
    const item = food_list.find((food) => String(food._id) === String(itemId));

    setCartItems((currentCartItems) => ({
      ...currentCartItems,
      [itemId]: Math.max((currentCartItems[itemId] || 0) - 1, 0),
    }));

    if (token && !item?.localImage) {
      try {
        await axios.delete(`${url}/api/cart/remove?itemId=${itemId}`, { headers: { token } });
      } catch (error) {
        console.log(error);
        setCartItems((currentCartItems) => ({
          ...currentCartItems,
          [itemId]: (currentCartItems[itemId] || 0) + 1,
        }));
      }
    }
  };

  const getTotalCartAmount = () => {
    let total = 0;
    for (let eltId in cartItems) {
      if (cartItems[eltId] > 0) {
        let itemInfo = food_list.find((food) => food._id == eltId);
        if (itemInfo) {
          total += itemInfo.price * cartItems[eltId];
        }
      }
    }
    return total;
  };

  const previouslyOrderedItemIds = Array.from(
    new Set(
      userOrders.flatMap((order) =>
        order.items
          .map((item) => item?._id || item?.id)
          .filter(Boolean)
          .map((itemId) => String(itemId))
      )
    )
  );

  const addOrderItemsToCart = async (items = []) => {
    const mergedItems = {};

    for (const item of items) {
      const itemId = item?._id || item?.id;
      if (!itemId) continue;

      const quantity = Number(item.quantity) || 1;
      const normalizedItemId = String(itemId);
      mergedItems[normalizedItemId] = (mergedItems[normalizedItemId] || 0) + quantity;
    }

    setCartItems((currentCartItems) => {
      const nextCartItems = { ...currentCartItems };

      Object.entries(mergedItems).forEach(([itemId, quantity]) => {
        nextCartItems[itemId] = (nextCartItems[itemId] || 0) + quantity;
      });

      return nextCartItems;
    });

    if (token) {
      for (const [itemId, quantity] of Object.entries(mergedItems)) {
        for (let count = 0; count < quantity; count += 1) {
          try {
            await axios.post(url + "/api/cart/add", { itemId }, { headers: { token } });
          } catch (error) {
            console.log(error);
          }
        }
      }
    }
  };

  const contextValue = {
    cartItems,
    setCartItems,
    food_list,
    userOrders,
    fetchUserOrders,
    previouslyOrderedItemIds,
    addOrderItemsToCart,
    getFoodImageSrc,
    getCartOrderItems,
    getCheckoutQuote,
    restaurantSettings,
    addToCart,
    removeFromCart,
    getTotalCartAmount,
    url,
    token,
    setToken,
  };

  return <Store_Context.Provider value={contextValue}>{children}</Store_Context.Provider>;
};

export default Store_Context_Provider;
