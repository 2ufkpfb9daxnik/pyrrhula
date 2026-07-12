"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
};

/**
 * 両立方針:
 * - ユーザーが触る欄は常に type="text"（IME で全角入力可）
 * - 非表示時は -webkit-text-security で伏せ字
 * - 同時に type="password" のミラー欄を置き、ブラウザのパスワードマネージャに検知させる
 */
export function PasswordInput({
  className,
  visible,
  onVisibleChange,
  value,
  onChange,
  autoComplete,
  id,
  name = "password",
  ...props
}: PasswordInputProps) {
  const mirrorRef = React.useRef<HTMLInputElement>(null);

  // オートフィルがミラー欄に入ったとき、表示欄へ同期（React の onChange が飛ばないことがある）
  React.useEffect(() => {
    const el = mirrorRef.current;
    if (!el) return;

    const sync = () => {
      if (el.value !== String(value ?? "") && onChange) {
        const event = {
          target: el,
          currentTarget: el,
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    };

    el.addEventListener("input", sync);
    el.addEventListener("change", sync);
    const intervalId = window.setInterval(sync, 300);
    return () => {
      el.removeEventListener("input", sync);
      el.removeEventListener("change", sync);
      window.clearInterval(intervalId);
    };
  }, [value, onChange]);

  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        autoComplete="off"
        name={`${name}-visible`}
        className={cn("pr-16", className)}
        style={{
          ...props.style,
          ...(visible
            ? undefined
            : ({ WebkitTextSecurity: "disc" } as React.CSSProperties)),
        }}
      />
      {/* パスワードマネージャ用。display:none にすると無視されやすいので極小サイズで残す */}
      <input
        ref={mirrorRef}
        type="password"
        value={value ?? ""}
        onChange={onChange}
        autoComplete={autoComplete}
        name={name}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-[0.01]"
      />
      <Button
        type="button"
        variant="ghost"
        className="absolute right-2 top-1/2 -translate-y-1/2"
        onClick={() => onVisibleChange(!visible)}
      >
        {visible ? "非表示" : "表示"}
      </Button>
    </div>
  );
}
