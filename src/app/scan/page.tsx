import { Scanner } from "@/app/scan/scanner";
import { requireStaff } from "@/lib/server/admin-auth";

export default async function ScanPage() {
  await requireStaff();
  return <Scanner />;
}
