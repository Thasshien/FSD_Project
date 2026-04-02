import { useState, useEffect, useMemo } from "react";
import "./Orders.css";
import { assets } from "../../assets/assets";
import axios from "axios";

const statusClassMap = {
  "Food Processing": "processing",
  "Out For Delivery": "delivery",
  Delivered: "delivered",
  Cancelled: "cancelled",
};

const Orders = ({ url }) => {
  const [orders, setOrders] = useState([]);

  const fetchAllOrders = async () => {
    try {
      const response = await axios.get(url + "/api/order/list");
      setOrders(response.data.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  const statusHandler = async (event, orderId) => {
    try {
      await axios.post(url + "/api/order/status", {
        orderId,
        status: event.target.value,
      });
      await fetchAllOrders();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((firstOrder, secondOrder) => {
        const firstDate = new Date(firstOrder.date || 0).getTime();
        const secondDate = new Date(secondOrder.date || 0).getTime();
        return secondDate - firstDate;
      }),
    [orders]
  );

  return (
    <div className="screen order">
      <h3>Order Page</h3>
      <div className="order-list">
        {sortedOrders.map((order) => {
          const statusClass = statusClassMap[order.status] || "processing";

          return (
            <div key={order._id} className="order-item">
              <img src={assets.parcel_icon} alt="" />
              <div>
                <p className="order-item-food">
                  {order.items.map((item, itemIndex) => {
                    if (itemIndex === order.items.length - 1) {
                      return item.name + " x " + item.quantity;
                    }

                    return item.name + " x " + item.quantity + ", ";
                  })}
                </p>
                <p className="order-item-name">
                  {order.address.first_name + " " + order.address.last_name}
                </p>
                <div className="order-item-address">
                  <p>{order.address.street},</p>
                  <p>
                    {order.address.city +
                      ", " +
                      order.address.state +
                      ", " +
                      order.address.country +
                      ", " +
                      order.address.zip_code}
                  </p>
                </div>
                <p className="order-item-phone">{order.address.phone}</p>
              </div>
              <div className="order-item-meta">
                <p>Items: {order.items.length}</p>
                <p>Total: Rs {order.amount}</p>
                <p>GST: Rs {order.pricing?.gstAmount ?? 0}</p>
                <p>Delivery: Rs {order.pricing?.deliveryFee ?? 0}</p>
                <p>ETA: {order.deliveryMeta?.estimatedDeliveryMinutes ?? 30} mins</p>
                <p>{new Date(order.date).toLocaleString()}</p>
              </div>
              <span className={`order-status-badge ${statusClass}`}>{order.status}</span>
              <select
                className={`order-item-select ${statusClass}`}
                onChange={(event) => statusHandler(event, order._id)}
                value={order.status}
              >
                <option value="Food Processing">Food Processing</option>
                <option value="Out For Delivery">Out For Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Orders;
