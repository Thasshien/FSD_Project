import { useContext, useEffect, useState } from "react";
import "./Verify.css";
import axios from "axios";
import { Store_Context } from "../../context/Store_Context";
import { useSearchParams, useNavigate } from "react-router-dom";

const Verify = () => {
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success");
  const orderId = searchParams.get("orderId");
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const { url } = useContext(Store_Context);
  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId || !success) {
        setStatus("failed");
        return;
      }

      try {
        const response = await axios.post(url + "/api/order/verify", { success, orderId, sessionId });

        if (response.data.message === "Not paid") {
          setStatus("failed");
          setTimeout(() => navigate("/"), 2200);
          return;
        }

        setStatus("success");
        setTimeout(() => navigate("/myorders"), 2200);
      } catch (error) {
        console.log(error);
        setStatus("failed");
        setTimeout(() => navigate("/"), 2200);
      }
    };

    verifyPayment();
  }, [navigate, orderId, sessionId, success, url]);

  return (
    <div className="verify-page">
      <div className="verify-card">
        {status === "verifying" ? (
          <>
            <div className="verify-spinner"></div>
            <h2>Confirming your payment</h2>
            <p>We are verifying your order with the payment gateway. Please wait a moment.</p>
          </>
        ) : null}

        {status === "success" ? (
          <>
            <div className="verify-icon success">OK</div>
            <h2>Payment successful</h2>
            <p>Your order is confirmed. Redirecting you to your orders page now.</p>
          </>
        ) : null}

        {status === "failed" ? (
          <>
            <div className="verify-icon failed">!</div>
            <h2>Payment could not be confirmed</h2>
            <p>We could not complete verification for this order. Redirecting you back home.</p>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Verify;
