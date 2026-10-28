/* Kitchen display – real-time order queue via WebSocket. */
import { KdsBoard } from "../features/kds";
import { RequireStaff } from "../features/staff/StaffShell";

export default function KitchenPage() {
  return (
    <RequireStaff roles={["kitchen", "waiter", "admin"]}>
      <KdsBoard />
    </RequireStaff>
  );
}
