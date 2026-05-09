"use server";

import { revalidatePath } from "next/cache";

import {
  getTemplateById,
  insertTemplate,
  publishTemplate,
  restorePublishedToDraft,
  upsertDraftDocument,
} from "@/lib/db";
import {
  parseTemplateDocument,
  type TemplateDocument,
} from "@/lib/template-document";

export type CreateTemplateState = {
  error?: string;
  ok?: boolean;
};

const MAX_DIMENSION = 16384;
const MAX_DOCUMENT_BYTES = 512_000;

export async function createTemplateAction(
  _prev: CreateTemplateState,
  formData: FormData,
): Promise<CreateTemplateState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const widthRaw = String(formData.get("width") ?? "").trim();
  const heightRaw = String(formData.get("height") ?? "").trim();

  if (!name) {
    return { error: "Name is required." };
  }

  const width = Number.parseInt(widthRaw, 10);
  const height = Number.parseInt(heightRaw, 10);

  if (!Number.isFinite(width) || width <= 0 || width > MAX_DIMENSION) {
    return { error: "Width must be a positive number." };
  }
  if (!Number.isFinite(height) || height <= 0 || height > MAX_DIMENSION) {
    return { error: "Height must be a positive number." };
  }

  insertTemplate({ name, width, height, description });
  revalidatePath("/dashboard/templates");
  return { ok: true };
}

export async function saveDraftAction(
  templateId: number,
  document: TemplateDocument,
): Promise<CreateTemplateState> {
  if (!getTemplateById(templateId)) {
    return { error: "Template not found." };
  }

  const serialized = JSON.stringify(document);
  if (serialized.length > MAX_DOCUMENT_BYTES) {
    return { error: "Template is too large to save." };
  }

  upsertDraftDocument(templateId, parseTemplateDocument(serialized));
  revalidatePath(`/dashboard/templates/${templateId}/edit`);
  return { ok: true };
}

export async function publishTemplateAction(
  templateId: number,
): Promise<CreateTemplateState> {
  if (!getTemplateById(templateId)) {
    return { error: "Template not found." };
  }

  try {
    publishTemplate(templateId);
  } catch {
    return { error: "Could not publish this template." };
  }

  revalidatePath(`/dashboard/templates/${templateId}/edit`);
  revalidatePath("/dashboard/templates");
  return { ok: true };
}

export async function restoreVersionAction(
  templateId: number,
  versionId: number,
): Promise<CreateTemplateState> {
  if (!getTemplateById(templateId)) {
    return { error: "Template not found." };
  }

  try {
    restorePublishedToDraft(templateId, versionId);
  } catch {
    return { error: "Could not restore that version." };
  }

  revalidatePath(`/dashboard/templates/${templateId}/edit`);
  return { ok: true };
}
