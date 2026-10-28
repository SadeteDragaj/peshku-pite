/* Waiter page – wraps the WaiterDashboard feature module. */
import { WaiterDashboard } from "../features/waiter";
import { RequireStaff } from "../features/staff/StaffShell";

export default function WaiterPage() {
  return (
    <RequireStaff roles={["waiter", "admin"]}>
      <WaiterDashboard />
    </RequireStaff>
  );
}
