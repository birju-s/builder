"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  projectId: string;
  disabled?: boolean;
}

export function PublishButton({ projectId, disabled }: Props) {
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);

  async function handleClick() {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
      });
      if (!res.ok) {
        alert("Deploy event failed");
        return;
      }
      const { ok } = await res.json();
      if (ok) {
        setUrl("Deploy started… check messages");
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={disabled || isPending}>
        {isPending ? "Publishing…" : "Publish"}
      </Button>
      {url && <p className="text-sm text-muted-foreground">{url}</p>}
    </div>
  );
}
