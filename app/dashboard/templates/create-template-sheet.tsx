"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useId, useRef, useState, useTransition } from "react";

import { createTemplateAction } from "@/app/dashboard/templates/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function CreateTemplateSheet() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement | null>(null);

  const nameId = useId();
  const widthId = useId();
  const heightId = useId();
  const descriptionId = useId();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await createTemplateAction({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setError(undefined);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button>
            <PlusIcon data-icon="inline-start" />
            Create template
          </Button>
        }
      />
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>New template</SheetTitle>
          <SheetDescription>
            Define a reusable canvas for your displays.
          </SheetDescription>
        </SheetHeader>

        <form
          ref={formRef}
          action={handleAction}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Could not create template</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={nameId}>Name</FieldLabel>
                <Input
                  id={nameId}
                  name="name"
                  placeholder="Lobby menu"
                  required
                  autoFocus
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor={widthId}>Width</FieldLabel>
                  <Input
                    id={widthId}
                    name="width"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    placeholder="1920"
                    required
                  />
                  <FieldDescription>Pixels</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor={heightId}>Height</FieldLabel>
                  <Input
                    id={heightId}
                    name="height"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    placeholder="1080"
                    required
                  />
                  <FieldDescription>Pixels</FieldDescription>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
                <Input
                  id={descriptionId}
                  name="description"
                  placeholder="Optional"
                />
              </Field>
            </FieldGroup>
          </div>

          <div className="mt-auto flex flex-row justify-end gap-2 border-t p-4">
            <SheetClose
              render={
                <Button variant="outline" type="button" disabled={isPending}>
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create template"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
