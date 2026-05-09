"use client";

import type { ComponentType } from "react";

import type {
  TemplateElement,
  TemplateElementType,
} from "@/lib/template-document";

export type ElementCanvasProps = {
  element: TemplateElement;
};

export type ElementPropertiesProps = {
  element: TemplateElement;
  onChange: (props: Record<string, unknown>) => void;
};

export type ElementDefinition = {
  type: TemplateElementType;
  label: string;
  defaultProps: Record<string, unknown>;
  normalizeProps: (props: Record<string, unknown>) => Record<string, unknown>;
  Canvas: ComponentType<ElementCanvasProps>;
  PropertiesPanel: ComponentType<ElementPropertiesProps>;
};
