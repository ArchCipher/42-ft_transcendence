import type { ReactNode } from "react";

type StatusNoticeProps = {
  role?: "status" | "alert";
  children: ReactNode;
};

export default function StatusNotice({
  role = "status",
  children,
}: StatusNoticeProps) {
  return (
    <div className="AuthNotice" role={role}>
      {children}
    </div>
  );
}
