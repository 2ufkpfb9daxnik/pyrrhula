import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-[200px] items-center justify-center">
      <LoaderCircle className="size-6 animate-spin text-primary" />
    </div>
  );
}
