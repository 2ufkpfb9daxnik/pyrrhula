import { useState } from "react";
import { toast } from "sonner";

interface UseOptimisticUpdateProps {
  initialCount: number;
  initialState: boolean;
  successMessage: {
    add: string;
    remove: string;
  };
  errorMessage: string;
}

export function useOptimisticUpdate({
  initialCount,
  initialState,
  successMessage,
  errorMessage,
}: UseOptimisticUpdateProps) {
  const [count, setCount] = useState(initialCount);
  const [isActive, setIsActive] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);

  const execute = async (
    apiCall: () => Promise<Response>,
    onSuccess?: () => Promise<void>
  ) => {
    if (isLoading) return;

    // 楽観的更新
    setCount((prev) => (isActive ? prev - 1 : prev + 1));
    setIsActive((prev) => !prev);
    setIsLoading(true);

    try {
      const response = await apiCall();
      if (!response.ok) {
        // 失敗した場合は元に戻す
        setCount((prev) => (isActive ? prev + 1 : prev - 1));
        setIsActive((prev) => !prev);
        throw new Error("Failed to update");
      }

      toast.success(isActive ? successMessage.remove : successMessage.add);
      if (onSuccess) await onSuccess();
    } catch (error) {
      toast.error(errorMessage);
      // エラー時は既に状態を元に戻しているので何もしない
    } finally {
      setIsLoading(false);
    }
  };

  return {
    count,
    isActive,
    isLoading,
    execute,
  };
}
