/* Manager board – the day's money, staff, table assignment and guest reviews. */
import { RequireStaff } from "../features/staff/StaffShell";
import ManagerBoard from "../features/manager/ManagerBoard";

export default function ManagerPage() {
  return (
    <RequireStaff roles={["admin"]}>
      <ManagerBoard />
    </RequireStaff>
  );
}
