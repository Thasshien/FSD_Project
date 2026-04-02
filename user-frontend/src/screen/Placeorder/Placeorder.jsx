import { useContext, useEffect, useMemo, useState } from "react";
import "./Placeorder.css";
import { Store_Context } from "../../context/Store_Context";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const formatEtaLabel = (etaValue) => {
  if (!etaValue) return "Will appear after validation";

  const etaDate = new Date(etaValue);
  const now = new Date();
  const isSameDay = etaDate.toDateString() === now.toDateString();
  const dayLabel = isSameDay ? "Today" : etaDate.toLocaleDateString();
  return `${dayLabel} by ${etaDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
};

const initialAddress = {
  first_name: "",
  last_name: "",
  email: "",
  street: "",
  city: "",
  state: "",
  zip_code: "",
  country: "",
  phone: "",
};

const PlaceOrder = () => {
  const [data, setData] = useState(initialAddress);
  const [quote, setQuote] = useState(null);
  const [quoteErrors, setQuoteErrors] = useState([]);
  const [quoteWarnings, setQuoteWarnings] = useState([]);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [promoInput, setPromoInput] = useState("");

  const { getTotalCartAmount, getCartOrderItems, getCheckoutQuote, restaurantSettings, url, token, promoCode, setPromoCode } =
    useContext(Store_Context);
  const navigate = useNavigate();
  const totalCartAmount = getTotalCartAmount();

  const canFetchQuote = token && totalCartAmount > 0 && /^\d{6}$/.test(String(data.zip_code).trim());

  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setData((currentData) => ({ ...currentData, [name]: value }));
  };

  const handleApplyPromo = () => {
    const normalizedCode = promoInput.trim().toUpperCase();

    if (!normalizedCode) {
      setPromoCode("");
      toast.info("Promo code removed.");
      return;
    }

    if (normalizedCode !== "SAVE10") {
      toast.error("Invalid promo code. Use SAVE10.");
      return;
    }

    setPromoCode(normalizedCode);
    toast.success("SAVE10 applied. 10% discount will be included in checkout.");
  };

  useEffect(() => {
    if (!token || totalCartAmount === 0) {
      navigate("/cart");
    }
  }, [token, navigate, totalCartAmount]);

  useEffect(() => {
    setPromoInput(promoCode);
  }, [promoCode]);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!canFetchQuote) {
        setQuote(null);
        setQuoteErrors([]);
        setQuoteWarnings([]);
        return;
      }

      setIsFetchingQuote(true);
      try {
        const response = await getCheckoutQuote(data, token);
        setQuote(response);
        setQuoteErrors(response?.errors || []);
        setQuoteWarnings(response?.warnings || []);
      } catch (error) {
        setQuote(null);
        setQuoteErrors(error?.errors || [error?.message || "Unable to calculate charges right now."]);
        setQuoteWarnings([]);
      } finally {
        setIsFetchingQuote(false);
      }
    };

    const timeoutId = setTimeout(fetchQuote, 350);
    return () => clearTimeout(timeoutId);
  }, [data, canFetchQuote, getCheckoutQuote, token, promoCode]);

  const isOrderBlocked = useMemo(() => quoteErrors.length > 0, [quoteErrors]);

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    if (!quote || isOrderBlocked) {
      toast.error("Please resolve the order issues before proceeding to payment.");
      return;
    }

    const orderData = {
      address: data,
      items: getCartOrderItems(),
      amount: quote.pricing.total,
      promoCode,
      origin: window.location.origin,
    };

    try {
      const response = await axios.post(url + "/api/order/place", orderData, { headers: { token } });
      const { session_url } = response.data;
      window.location.replace(session_url);
    } catch (error) {
      const serverErrors = error.response?.data?.errors || [error.response?.data?.message || "Unable to place order."];
      serverErrors.forEach((message) => toast.error(message));
    }
  };

  return (
    <form onSubmit={onSubmitHandler} className="place-order">
      <div className="place-order-left">
        <p className="title">Delivery Information</p>
        <div className="multi-fields">
          <input required name="first_name" value={data.first_name} onChange={onChangeHandler} type="text" placeholder="First Name" />
          <input required name="last_name" value={data.last_name} onChange={onChangeHandler} type="text" placeholder="Last Name" />
        </div>
        <input required name="email" value={data.email} onChange={onChangeHandler} type="email" placeholder="Email address" />
        <input required name="street" value={data.street} onChange={onChangeHandler} type="text" placeholder="Street" />
        <div className="multi-fields">
          <input required name="city" value={data.city} onChange={onChangeHandler} type="text" placeholder="City" />
          <input required name="state" value={data.state} onChange={onChangeHandler} type="text" placeholder="State" />
        </div>
        <div className="multi-fields">
          <input required name="zip_code" value={data.zip_code} onChange={onChangeHandler} type="text" placeholder="6-digit Zip code" />
          <input required name="country" value={data.country} onChange={onChangeHandler} type="text" placeholder="Country" />
        </div>
        <input required name="phone" value={data.phone} onChange={onChangeHandler} type="text" placeholder="10-digit Phone" />

        <div className="place-order-notes">
          <h3>Operational rules</h3>
          <p>Orders outside our supported pincodes or below the minimum order amount are blocked automatically.</p>
          <p>
            {restaurantSettings.restaurantName || "Restaurant"} accepts orders between{" "}
            {restaurantSettings.opensAtHour}:00 and {restaurantSettings.closesAtHour}:00.
          </p>
          <p>Orders can be cancelled only within 10 minutes and before they go out for delivery.</p>
        </div>

        <div className="place-order-notes">
          <h3>Promo code</h3>
          <p>Apply `SAVE10` here to get 10% off on subtotal.</p>
          <div className="place-order-promo">
            <input
              type="text"
              value={promoInput}
              onChange={(event) => setPromoInput(event.target.value)}
              placeholder="Enter SAVE10"
            />
            <button type="button" onClick={handleApplyPromo}>
              Apply
            </button>
          </div>
          {promoCode ? <p>Applied code: {promoCode}</p> : null}
        </div>
      </div>

      <div className="place-order-right">
        <div className="cart-total">
          <h2>Checkout Summary</h2>
          <div>
            <div className="cart-total-details">
              <p>Subtotal</p>
              <p>Rs {quote?.pricing?.subtotal ?? totalCartAmount}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>GST</p>
              <p>Rs {quote?.pricing?.gstAmount ?? 0}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Delivery Fee</p>
              <p>Rs {quote?.pricing?.deliveryFee ?? 0}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Peak Surcharge</p>
              <p>Rs {quote?.pricing?.peakSurcharge ?? 0}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Promo Discount</p>
              <p>-Rs {quote?.pricing?.discountAmount ?? 0}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Total</p>
              <p>Rs {quote?.pricing?.total ?? totalCartAmount}</p>
            </div>
          </div>

          <div className="quote-panel">
            <p>
              <strong>Delivery zone:</strong>{" "}
              {quote?.rules?.deliveryZone?.label || "Enter pincode to validate delivery"}
            </p>
            <p>
              <strong>Estimated delivery:</strong> {formatEtaLabel(quote?.rules?.estimatedDeliveryAt)}
            </p>
            <p>
              <strong>ETA logic:</strong>{" "}
              {quote?.rules?.estimatedPrepMinutes
                ? `${quote.rules.estimatedPrepMinutes} mins prep + ${quote.rules.estimatedTravelMinutes || 0} mins travel`
                : "We will calculate prep and delivery time after validation"}
            </p>
            <p>
              <strong>Dish prep times:</strong>{" "}
              {quote?.rules?.prepBreakdown?.length
                ? quote.rules.prepBreakdown
                    .map((item) => `${item.name} (${item.prepTimeMinutes} mins)`)
                    .join(", ")
                : "Will appear after validation"}
            </p>
            <p>
              <strong>Promo:</strong>{" "}
              {quote?.rules?.promoApplied
                ? `${quote.rules.promoCode} applied for ${quote.rules.promoDiscountPercent}% off`
                : `Use ${quote?.rules?.promoCode || "SAVE10"} for ${quote?.rules?.promoDiscountPercent || 10}% off`}
            </p>
            <p>
              <strong>Free delivery above:</strong> Rs {quote?.rules?.freeDeliveryThreshold || 499}
            </p>
          </div>

          {isFetchingQuote ? <p className="quote-status">Checking delivery rules...</p> : null}

          {quoteWarnings.length ? (
            <div className="quote-message warning">
              {quoteWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          {quoteErrors.length ? (
            <div className="quote-message error">
              {quoteErrors.map((errorMessage) => (
                <p key={errorMessage}>{errorMessage}</p>
              ))}
            </div>
          ) : null}

          <button type="submit" disabled={!quote || isOrderBlocked}>
            Proceed to Payment
          </button>
        </div>
      </div>
    </form>
  );
};

export default PlaceOrder;
