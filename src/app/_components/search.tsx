"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export function Search({ onSearch }: SearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div className="flex">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="投稿を検索..."
          className="mr-2 flex-1"
        />
        <Button type="submit">検索</Button>
      </div>
    </form>
  );
}
