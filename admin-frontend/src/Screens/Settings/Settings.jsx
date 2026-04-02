import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const Settings = ({ url }) => {
  const [settings, setSettings] = useState({
    restaurantName: "Food Prep",
    opensAtHour: 10,
    closesAtHour: 22,
  });

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${url}/api/settings`);
      setSettings(response.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setSettings((currentSettings) => ({ ...currentSettings, [name]: value }));
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post(`${url}/api/settings/update`, settings);
      toast.success(response.data.message);
      fetchSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update settings");
    }
  };

  return (
    <div className="screen">
      <div className="container">
        <form onSubmit={onSubmitHandler} className="flex-col">
          <div className="add-product-name flex-col">
            <p>Restaurant name</p>
            <input
              value={settings.restaurantName || ""}
              onChange={onChangeHandler}
              type="text"
              name="restaurantName"
              placeholder="Food Prep"
            />
          </div>

          <div className="add-nutrition-grid">
            <div className="flex-col">
              <p>Opens at hour</p>
              <input
                value={settings.opensAtHour}
                onChange={onChangeHandler}
                type="number"
                min="0"
                max="23"
                name="opensAtHour"
              />
            </div>
            <div className="flex-col">
              <p>Closes at hour</p>
              <input
                value={settings.closesAtHour}
                onChange={onChangeHandler}
                type="number"
                min="1"
                max="24"
                name="closesAtHour"
              />
            </div>
          </div>

          <button type="submit" className="add-btn">
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
