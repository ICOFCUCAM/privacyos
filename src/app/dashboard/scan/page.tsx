import { getDataSource } from "@/lib/data";
import { ScaryMirror } from "./mirror";

export const metadata = { title: "Exposure Scan" };

export default async function ScanPage() {
  const ds = await getDataSource();
  const data = await ds.getDataset();
  const defaultName = data.subject.displayName ?? "";

  return (
    <div className="py-4">
      <ScaryMirror defaultName={defaultName} />
    </div>
  );
}
