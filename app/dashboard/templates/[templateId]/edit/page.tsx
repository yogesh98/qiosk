import { notFound } from "next/navigation";

import { TemplateEditor } from "@/components/template-editor/template-editor";
import {
  getDraftDocument,
  getPublishedVersions,
  getTemplateById,
} from "@/lib/db";
import { parseTemplateDocument } from "@/lib/template-document";

type TemplateEditorPageProps = {
  params: Promise<{
    templateId: string;
  }>;
};

export default async function TemplateEditorPage({
  params,
}: TemplateEditorPageProps) {
  const { templateId: templateIdParam } = await params;
  const templateId = Number.parseInt(templateIdParam, 10);

  if (!Number.isFinite(templateId)) {
    notFound();
  }

  const template = getTemplateById(templateId);
  if (!template) {
    notFound();
  }

  const draftDocument = getDraftDocument(template.id);
  const versions = getPublishedVersions(template.id).map((version) => ({
    id: version.id,
    version: version.version ?? 0,
    publishedAt: version.published_at ?? version.created_at,
    document: parseTemplateDocument(version.document),
  }));

  return (
    <TemplateEditor
      template={template}
      initialDocument={draftDocument}
      versions={versions}
    />
  );
}
