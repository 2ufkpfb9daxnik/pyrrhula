"use client";

type ColumnFrameProps = {
  src: string;
  className?: string;
  hideNav?: boolean;
  hideScrollbar?: boolean;
};

export function ColumnFrame({
  src,
  className = "",
  hideNav = true,
  hideScrollbar = true,
}: ColumnFrameProps) {
  // URLパラメータを追加
  const url = new URL(src, window.location.origin);
  if (hideNav) {
    url.searchParams.set("hideNav", "true");
  }
  url.searchParams.set("column", "true");

  return (
    <iframe
      src={url.toString()}
      className={`w-full h-full border-0 ${hideScrollbar ? "scrollbar-none" : ""} ${className}`}
      style={{
        height: "calc(100vh - 64px)",
      }}
    />
  );
}
