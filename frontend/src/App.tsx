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
import MenuManagerPage from "./pages/MenuManagerPage";
import ManagerPage from "./pages/ManagerPage";
import {
  AttractScreen,
  BillScreen,
  MenuScreen,
  RatingScreen,
  ReviewScreen,
  StatusScreen,
  TabletLayout,
} from "./features/tablet";

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
      <Route path="/menu-manager" element={<MenuManagerPage />} />
      <Route path="/manager" element={<ManagerPage />} />

      {/* Guest tablet on each table – open /t/7?key=… once to link the device */}
      <Route path="/t/:number" element={<TabletLayout />}>
        <Route index element={<AttractScreen />} />
        <Route path="menu" element={<MenuScreen />} />
        <Route path="review" element={<ReviewScreen />} />
        <Route path="status" element={<StatusScreen />} />
        <Route path="bill" element={<BillScreen />} />
        <Route path="rating" element={<RatingScreen />} />
      </Route>
    </Routes>
  );
}
