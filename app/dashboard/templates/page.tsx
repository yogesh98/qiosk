import { FrameCornersIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { CreateTemplateSheet } from "@/app/dashboard/templates/create-template-sheet";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTemplates, type TemplateRow } from "@/lib/db";

function formatCreatedAt(value: number) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function aspectLabel(width: number, height: number) {
  if (width === height) return "1:1";
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function TemplateCard({ template }: { template: TemplateRow }) {
  const { id, width, height, name, description, created_at } = template;
  const orientation =
    width === height ? "Square" : width > height ? "Landscape" : "Portrait";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate text-base">{name}</CardTitle>
        <CardDescription className="line-clamp-2 min-h-[2lh]">
          {description || "No description"}
        </CardDescription>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Size</span>
          <span className="tabular-nums">
            {width.toLocaleString()} × {height.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Aspect</span>
          <span className="tabular-nums">
            {aspectLabel(width, height)}{" "}
            <span className="text-muted-foreground">· {orientation}</span>
          </span>
        </div>
      </CardContent>

      <CardFooter className="justify-between text-xs text-muted-foreground">
        <span>Created {formatCreatedAt(created_at)}</span>
        <Button
          size="sm"
          variant="outline"
          render={<Link href={`/dashboard/templates/${id}/edit`} />}
        >
          Edit
        </Button>
      </CardFooter>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 border bg-card p-12 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FrameCornersIcon className="size-5" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">No templates yet</h3>
        <p className="max-w-sm text-xs text-muted-foreground">
          Templates define the canvas size for your displays. Create your first
          one to get started.
        </p>
      </div>
      <div className="mt-2">
        <CreateTemplateSheet />
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const templates = getTemplates();

  return (
    <section
      className="flex flex-1 flex-col gap-6 bg-background p-6"
      aria-label="Templates"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">Templates</h2>
          <p className="text-xs text-muted-foreground">
            {templates.length === 0
              ? "Define reusable canvases for your displays."
              : `${templates.length} ${
                  templates.length === 1 ? "template" : "templates"
                } in your library.`}
          </p>
        </div>
        {templates.length > 0 ? <CreateTemplateSheet /> : null}
      </div>

      {templates.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}
