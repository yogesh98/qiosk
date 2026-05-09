"use client";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
  ElementCanvasProps,
  ElementDefinition,
  ElementPropertiesProps,
} from "@/components/elements/types";

type TextProps = {
  content: string;
  fontSize: number;
};

const defaultProps: TextProps = {
  content: "Text",
  fontSize: 48,
};

function normalizeProps(props: Record<string, unknown>): TextProps {
  return {
    content: typeof props.content === "string" ? props.content : "Text",
    fontSize:
      typeof props.fontSize === "number" && Number.isFinite(props.fontSize)
        ? props.fontSize
        : 48,
  };
}

function TextCanvas({ element }: ElementCanvasProps) {
  const props = normalizeProps(element.props);

  return (
    <div
      className="font-medium leading-tight text-foreground whitespace-pre-wrap"
      style={{ fontSize: props.fontSize }}
    >
      {props.content}
    </div>
  );
}

function TextPropertiesPanel({
  element,
  onChange,
}: ElementPropertiesProps) {
  const props = normalizeProps(element.props);

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="text-content">Content</FieldLabel>
        <Input
          id="text-content"
          value={props.content}
          onChange={(event) =>
            onChange({ ...props, content: event.currentTarget.value })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="text-font-size">Font size</FieldLabel>
        <Input
          id="text-font-size"
          type="number"
          min={8}
          max={240}
          step={1}
          value={props.fontSize}
          onChange={(event) =>
            onChange({
              ...props,
              fontSize: Number.parseInt(event.currentTarget.value, 10) || 8,
            })
          }
        />
      </Field>
    </FieldGroup>
  );
}

export const textElementDefinition: ElementDefinition = {
  type: "text",
  label: "Text",
  defaultProps,
  normalizeProps,
  Canvas: TextCanvas,
  PropertiesPanel: TextPropertiesPanel,
};
