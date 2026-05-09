"use client";

import { buttonElementDefinition } from "@/components/elements/button-element";
import { textElementDefinition } from "@/components/elements/text-element";
import type { ElementDefinition } from "@/components/elements/types";
import type { TemplateElementType } from "@/lib/template-document";

export const elementDefinitions = {
  text: textElementDefinition,
  button: buttonElementDefinition,
} satisfies Record<TemplateElementType, ElementDefinition>;

export function getElementDefinition(type: TemplateElementType) {
  return elementDefinitions[type];
}
