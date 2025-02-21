"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { LogOut, Home } from "lucide-react";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      await signOut({ redirect: false });
    };
    handleLogout();
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="w-[400px]">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <LogOut className="size-12 text-gray-400" />
            <h1 className="text-2xl font-bold">ログアウトしました</h1>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => router.push("/")}
            variant="default"
          >
            <Home className="mr-2 size-4" />
            トップページに戻る
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
