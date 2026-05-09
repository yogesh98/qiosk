export type TemplateElementType = "text" | "button";

export type TemplateElement = {
  id: string;
  type: TemplateElementType;
  x: number;
  y: number;
  zIndex: number;
  props: Record<string, unknown>;
};

export type TemplatePage = {
  id: string;
  title?: string;
  elements: TemplateElement[];
};

export type TemplateDocument = {
  pages: TemplatePage[];
};

export function createEmptyTemplateDocument(): TemplateDocument {
  return {
    pages: [
      {
        id: "page-1",
        title: "Page 1",
        elements: [],
      },
    ],
  };
}

export function parseTemplateDocument(value: string): TemplateDocument {
  try {
    const parsed = JSON.parse(value) as Partial<TemplateDocument>;
    if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      return createEmptyTemplateDocument();
    }

    return {
      pages: parsed.pages.map((page, pageIndex) => ({
        id: typeof page.id === "string" ? page.id : `page-${pageIndex + 1}`,
        title:
          typeof page.title === "string" && page.title.trim()
            ? page.title
            : `Page ${pageIndex + 1}`,
        elements: Array.isArray(page.elements)
          ? page.elements.filter(isTemplateElement)
          : [],
      })),
    };
  } catch {
    return createEmptyTemplateDocument();
  }
}

function isTemplateElement(value: unknown): value is TemplateElement {
  if (!value || typeof value !== "object") return false;
  const element = value as Partial<TemplateElement>;

  return (
    typeof element.id === "string" &&
    (element.type === "text" || element.type === "button") &&
    typeof element.x === "number" &&
    typeof element.y === "number" &&
    typeof element.zIndex === "number" &&
    !!element.props &&
    typeof element.props === "object"
  );
}
