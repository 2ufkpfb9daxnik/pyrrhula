"use client";

import { useCallback, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt: string;
}

export function ImageModal({ isOpen, onClose, src, alt }: ImageModalProps) {
  // ESCキーでモーダルを閉じる
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/80"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 min-h-[200px] w-auto max-w-[90vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto border-none bg-transparent p-0"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X className="size-6" />
          </button>
          <img
            src={src}
            alt={alt}
            className="size-auto max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
