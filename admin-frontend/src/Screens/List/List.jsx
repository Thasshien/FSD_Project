import { useState, useEffect } from "react";
import "./List.css";
import axios from "axios";
import { toast } from "react-toastify";

const List = ({ url }) => {
  const [list, setList] = useState([]);

  const fetchList = async () => {
    try {
      const response = await axios.get(`${url}/api/food/list`);
      setList(response.data.data || []);
    } catch (error) {
      console.log(error.message);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const removeFood = async (id) => {
    try {
      const response = await axios.delete(`${url}/api/food/remove?id=${id}`);
      toast(response.data.message);
      fetchList();
    } catch (error) {
      console.log(error.message);
    }
  };

  const updateFoodMeta = async (item, updates) => {
    try {
      await axios.post(`${url}/api/food/update-meta`, {
        id: item._id,
        available: updates.available ?? item.available,
        prepTimeMinutes: updates.prepTimeMinutes ?? item.prepTimeMinutes,
        gstRate: updates.gstRate ?? item.gstRate,
      });
      fetchList();
    } catch (error) {
      console.log(error.message);
    }
  };

  return (
    <div className="list screen flex-col">
      <p>All Foods List</p>
      <div className="list-table">
        <div className="list-table-format title">
          <p>
            <b>Image</b>
          </p>
          <p>
            <b>Name</b>
          </p>
          <p>
            <b>Category</b>
          </p>
          <p>
            <b>Price</b>
          </p>
          <p>
            <b>Prep (mins)</b>
          </p>
          <p>
            <b>Availability</b>
          </p>
          <p>
            <b>Action</b>
          </p>
        </div>
        {list.map((item) => {
          return (
            <div key={item._id} className="list-table-format">
              <img src={`${url}/image/${item.image}`} alt="" />
              <p>{item.name}</p>
              <p>{item.category}</p>
              <p>Rs {item.price}</p>
              <input
                type="number"
                min="5"
                value={item.prepTimeMinutes ?? 25}
                onChange={(event) =>
                  setList((currentList) =>
                    currentList.map((currentItem) =>
                      currentItem._id === item._id
                        ? { ...currentItem, prepTimeMinutes: Number(event.target.value) }
                        : currentItem
                    )
                  )
                }
                onBlur={() => updateFoodMeta(item, { prepTimeMinutes: item.prepTimeMinutes })}
              />
              <label className={`list-availability ${item.available !== false ? "available" : "unavailable"}`}>
                <input
                  type="checkbox"
                  checked={item.available !== false}
                  onChange={(event) => updateFoodMeta(item, { available: event.target.checked })}
                />
                {item.available !== false ? "Live" : "Paused"}
              </label>
              <p className="cursor" onClick={() => removeFood(item._id)}>
                X
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default List;
