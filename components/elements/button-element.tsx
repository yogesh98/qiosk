"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
  ElementCanvasProps,
  ElementDefinition,
  ElementPropertiesProps,
} from "@/components/elements/types";

type ButtonProps = {
  label: string;
  size: "sm" | "default" | "lg";
};

const defaultProps: ButtonProps = {
  label: "Button",
  size: "default",
};

function normalizeProps(props: Record<string, unknown>): ButtonProps {
  const size =
    props.size === "sm" || props.size === "default" || props.size === "lg"
      ? props.size
      : "default";

  return {
    label: typeof props.label === "string" ? props.label : "Button",
    size,
  };
}

function ButtonCanvas({ element }: ElementCanvasProps) {
  const props = normalizeProps(element.props);

  return (
    <Button type="button" size={props.size}>
      {props.label}
    </Button>
  );
}

function ButtonPropertiesPanel({
  element,
  onChange,
}: ElementPropertiesProps) {
  const props = normalizeProps(element.props);

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="button-label">Label</FieldLabel>
        <Input
          id="button-label"
          value={props.label}
          onChange={(event) =>
            onChange({ ...props, label: event.currentTarget.value })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="button-size">Size</FieldLabel>
        <select
          id="button-size"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={props.size}
          onChange={(event) =>
            onChange({
              ...props,
              size: event.currentTarget.value as ButtonProps["size"],
            })
          }
        >
          <option value="sm">Small</option>
          <option value="default">Medium</option>
          <option value="lg">Large</option>
        </select>
      </Field>
    </FieldGroup>
  );
}

export const buttonElementDefinition: ElementDefinition = {
  type: "button",
  label: "Button",
  defaultProps,
  normalizeProps,
  Canvas: ButtonCanvas,
  PropertiesPanel: ButtonPropertiesPanel,
};
