"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { UserSearchSelect } from "@/app/_components/UserSearchSelect";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "名前を入力してください")
    .max(50, "50文字以内で入力してください"),
  description: z
    .string()
    .max(500, "500文字以内で入力してください")
    .optional()
    .transform((val) => val || ""),
  isManaged: z.boolean().default(false),
  includeTimelinePosts: z.boolean().default(true),
  initialMembers: z
    .array(
      z.object({
        id: z.string(),
        username: z.string(),
        icon: z.string().nullable(),
      })
    )
    .default([]), // transformを削除
  initialAdmins: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

export function ListForm() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "", // 明示的に空文字列を設定
      isManaged: false,
      includeTimelinePosts: true,
      initialMembers: [], // 明示的に空配列を設定
      initialAdmins: [], // 明示的に空配列を設定
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: FormValues) => {
      // APIに送信する前にデータを変換
      const payload = {
        ...values,
        // 重複を除去してからIDの配列に変換
        initialMembers: Array.from(
          new Set(values.initialMembers.map((member) => member.id))
        ),
      };

      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "リストの作成に失敗しました");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("リストを作成しました");
      router.push(`/lists/${data.id}`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function onSubmit(values: FormValues) {
    mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>名前</FormLabel>
              <FormControl>
                <Input placeholder="リストの名前" {...field} />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明</FormLabel>
              <FormControl>
                <Textarea placeholder="リストの説明（オプション）" {...field} />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isManaged"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">管理リスト</FormLabel>
                <FormDescription>
                  メンバーの参加に承認が必要になります。
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="includeTimelinePosts"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  メンバーのすべての投稿を含める
                </FormLabel>
                <FormDescription>
                  ONにすると、リストのメンバーのすべての投稿がリストの投稿としても表示されます。
                  <br />
                  OFFにすると、リスト内での投稿のみがリストに含まれます。
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="initialMembers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>初期メンバー</FormLabel>
              <FormControl>
                <UserSearchSelect
                  selectedUsers={field.value}
                  onSelect={(users) => field.onChange(users)}
                />
              </FormControl>
              <FormDescription>
                リストに最初から追加するメンバーを選択してください。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("isManaged") && (
          <FormField
            control={form.control}
            name="initialAdmins"
            render={({ field }) => (
              <FormItem>
                <FormLabel>管理者</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {form.watch("initialMembers").map((user) => (
                    <Badge
                      key={user.id}
                      variant={
                        field.value.includes(user.id) ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        const newAdmins = field.value.includes(user.id)
                          ? field.value.filter((id) => id !== user.id)
                          : [...field.value, user.id];
                        field.onChange(newAdmins);
                      }}
                    >
                      {user.username}
                    </Badge>
                  ))}
                </div>
                <FormDescription>
                  管理者として設定するメンバーを選択してください。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={isPending}>
          {isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
          作成
        </Button>
      </form>
    </Form>
  );
}
