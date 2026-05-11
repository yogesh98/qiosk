"use server";

import { revalidatePath } from "next/cache";

import { insertTemplate } from "@/lib/db";

export type CreateTemplateState = {
  error?: string;
  ok?: boolean;
};

const MAX_DIMENSION = 16384;

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
