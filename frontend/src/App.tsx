/* Root App component with route declarations. */

import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MenuPage from "./pages/MenuPage";
import OrderPage from "./pages/OrderPage";
import KitchenPage from "./pages/KitchenPage";
import LoginPage from "./pages/LoginPage";
import CheckoutPage from "./pages/CheckoutPage";
import WaiterPage from "./pages/WaiterPage";
import InventoryPage from "./pages/InventoryPage";
import AnalyticsPage from "./pages/AnalyticsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/order" element={<OrderPage />} />
      <Route path="/kitchen" element={<KitchenPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/waiter" element={<WaiterPage />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
    </Routes>
  );
}
