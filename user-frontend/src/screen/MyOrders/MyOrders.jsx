import { useContext, useEffect, useMemo, useState } from "react";
import { Store_Context } from "../../context/Store_Context";
import Loader from "../../components/Loader/Loader";
import "./MyOrders.css";
import { assets } from "../../assets/assets";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const formatEtaLabel = (etaValue) => {
  if (!etaValue) return "Will update soon";

  const etaDate = new Date(etaValue);
  const now = new Date();
  const isSameDay = etaDate.toDateString() === now.toDateString();
  const dayLabel = isSameDay ? "Today" : etaDate.toLocaleDateString();

  return `${dayLabel} by ${etaDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
};

const getRefundLabel = (order) => {
  if (!order.payment) {
    return "No payment captured yet";
  }

  if (order.status !== "Cancelled" && order.refund?.status === "not_requested") {
    return "Paid via Stripe";
  }

  switch (order.refund?.status) {
    case "succeeded":
      return "Refund initiated to original payment method";
    case "pending":
      return "Refund is processing in Stripe";
    case "manual_review":
      return "Refund under manual review";
    case "not_required":
      return "No refund required";
    default:
      return order.status === "Cancelled" ? "Refund status will update shortly" : "Paid via Stripe";
  }
};

const statusClassMap = {
  "Food Processing": "processing",
  "Out For Delivery": "delivery",
  Delivered: "delivered",
  Cancelled: "cancelled",
};

const MyOrders = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("current");
  const { token, url, userOrders, fetchUserOrders, addOrderItemsToCart } = useContext(Store_Context);
  const navigate = useNavigate();

  const syncOrders = async (showLoader = false) => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    if (showLoader) setIsLoading(true);
    await fetchUserOrders(token);
    if (showLoader) setIsLoading(false);
  };

  useEffect(() => {
    syncOrders(true);
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;

    const intervalId = setInterval(() => {
      syncOrders(false);
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncOrders(false);
      }
    };

    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token]);

  const ordersWithMeta = useMemo(
    () =>
      userOrders.map((order) => ({
        ...order,
        statusClass: statusClassMap[order.status] || "processing",
        isPreviousOrder: order.status === "Delivered" || order.status === "Cancelled",
        canCancel:
          !order.cancellation?.isCancelled &&
          order.status !== "Out For Delivery" &&
          order.status !== "Delivered" &&
          order.status !== "Cancelled" &&
          order.cancellation?.allowedUntil &&
          new Date(order.cancellation.allowedUntil).getTime() > Date.now(),
      })),
    [userOrders]
  );

  const filteredOrders = useMemo(
    () =>
      ordersWithMeta.filter((order) =>
        activeTab === "previous" ? order.isPreviousOrder : !order.isPreviousOrder
      ),
    [activeTab, ordersWithMeta]
  );

  if (isLoading) return <Loader />;

  return (
    <div className="my-orders">
      <div className="my-orders-header">
        <div>
          <h2>My Orders</h2>
          <p>Track live status updates, reorder favourites, and cancel eligible orders within 10 minutes.</p>
        </div>
        <button className="my-orders-refresh" onClick={() => syncOrders(true)}>
          Refresh
        </button>
      </div>

      <div className="my-orders-tabs">
        <button
          type="button"
          className={activeTab === "current" ? "active" : ""}
          onClick={() => setActiveTab("current")}
        >
          Current Orders
        </button>
        <button
          type="button"
          className={activeTab === "previous" ? "active" : ""}
          onClick={() => setActiveTab("previous")}
        >
          Previous Orders
        </button>
      </div>

      <div className="container">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            return (
              <div key={order._id} className="my-orders-order">
                <div className="my-orders-top">
                  <div className="my-orders-icon">
                    <img src={assets.parcel_icon} alt="" />
                  </div>

                  <div className="my-orders-summary">
                    <div className="my-orders-title-row">
                      <p className="my-orders-items">
                        {order.items.map((item, itemIndex) => {
                          if (itemIndex === order.items.length - 1) {
                            return item.name + " x " + item.quantity;
                          }
                          return item.name + " x " + item.quantity + ", ";
                        })}
                      </p>
                      <span className={`my-orders-status ${order.statusClass}`}>{order.status}</span>
                    </div>

                    <div className="my-orders-grid">
                      <p>
                        <strong>Total:</strong> Rs {order.amount}
                      </p>
                      <p>
                        <strong>Items:</strong> {order.items.length}
                      </p>
                      <p>
                        <strong>ETA:</strong> {order.deliveryMeta?.estimatedDeliveryMinutes || 30} mins
                      </p>
                      <p>
                        <strong>ETA by:</strong> {formatEtaLabel(order.deliveryMeta?.estimatedDeliveryAt)}
                      </p>
                      <p>
                        <strong>Prep:</strong> {order.deliveryMeta?.estimatedPrepMinutes || 25} mins
                      </p>
                      <p>
                        <strong>Ordered:</strong> {new Date(order.date).toLocaleString()}
                      </p>
                      <p>
                        <strong>Delivery zone:</strong> {order.deliveryMeta?.label || "Will update soon"}
                      </p>
                      <p>
                        <strong>Cancel until:</strong>{" "}
                        {order.cancellation?.allowedUntil
                          ? new Date(order.cancellation.allowedUntil).toLocaleTimeString()
                          : "Not available"}
                      </p>
                      <p>
                        <strong>Refund:</strong> {getRefundLabel(order)}
                      </p>
                      {order.refund?.note ? (
                        <p>
                          <strong>Refund note:</strong> {order.refund.note}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="my-orders-actions">
                  <button
                    className="secondary"
                    onClick={async () => {
                      await addOrderItemsToCart(order.items);
                      navigate("/cart");
                    }}
                  >
                    Order Again
                  </button>
                  {order.canCancel ? (
                    <button
                      className="danger"
                      onClick={async () => {
                        try {
                          const response = await axios.post(
                            `${url}/api/order/cancel`,
                            { orderId: order._id },
                            { headers: { token } }
                          );
                          toast.success(response.data.message);
                          syncOrders(true);
                        } catch (error) {
                          toast.error(error.response?.data?.message || "Unable to cancel order");
                        }
                      }}
                    >
                      Cancel Order
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="my-orders-empty">
            {activeTab === "previous" ? "No previous orders found yet." : "No current orders found right now."}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
