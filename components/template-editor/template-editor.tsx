"use client";

import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  ArrowLeftIcon,
  ArrowLineDownIcon,
  ArrowLineUpIcon,
  ArrowsOutSimpleIcon,
  CaretDownIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  CursorIcon,
  DotsThreeIcon,
  FilesIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  PlusIcon,
  RectangleIcon,
  StackIcon,
  StackPlusIcon,
  StackSimpleIcon,
  TextTIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  publishTemplateAction,
  restoreVersionAction,
  saveDraftAction,
} from "@/app/dashboard/templates/actions";
import {
  elementDefinitions,
  getElementDefinition,
} from "@/components/elements/registry";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  TemplateDocument,
  TemplateElement,
  TemplateElementType,
  TemplatePage,
} from "@/lib/template-document";

type EditorTemplate = {
  id: number;
  name: string;
  width: number;
  height: number;
  description: string;
};

type PublishedVersion = {
  id: number;
  version: number;
  publishedAt: number;
  document: TemplateDocument;
};

type TemplateEditorProps = {
  template: EditorTemplate;
  initialDocument: TemplateDocument;
  versions: PublishedVersion[];
};

type DragData =
  | { kind: "palette"; type: TemplateElementType }
  | { kind: "element"; elementId: string };

type ContextMenuState = {
  x: number;
  y: number;
  elementId: string;
};

type LayerAction = "forward" | "backward" | "front" | "back";

type SaveStatus = "saved" | "saving" | "error";

const PALETTE_TYPES: TemplateElementType[] = ["text", "button"];
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1] as const;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2;
const ELEMENT_ICONS: Record<
  TemplateElementType,
  ComponentType<{ className?: string }>
> = {
  text: TextTIcon,
  button: RectangleIcon,
};

function formatVersionDate(value: number) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function createPage(pageNumber: number): TemplatePage {
  return {
    id: crypto.randomUUID(),
    title: `Page ${pageNumber}`,
    elements: [],
  };
}

function normalizeLayers(elements: TemplateElement[]) {
  return [...elements]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((element, index) => ({ ...element, zIndex: index }));
}

function getDragData(event: DragEndEvent): DragData | undefined {
  return event.active.data.current as DragData | undefined;
}

function describeElement(
  element: TemplateElement,
  fallback: string,
): string {
  const props = element.props as Record<string, unknown>;
  if (typeof props.content === "string" && props.content.trim()) {
    return props.content.trim();
  }
  if (typeof props.label === "string" && props.label.trim()) {
    return props.label.trim();
  }
  return fallback;
}

export function TemplateEditor({
  template,
  initialDocument,
  versions,
}: TemplateEditorProps) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const [doc, setDoc] = useState(initialDocument);
  const [activePageId, setActivePageId] = useState(
    initialDocument.pages[0]?.id ?? "page-1",
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [message, setMessage] = useState<string | null>(null);
  const [autoFit, setAutoFit] = useState(true);
  const [scale, setScale] = useState(1);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const didMountRef = useRef(false);

  const activePage =
    doc.pages.find((page) => page.id === activePageId) ?? doc.pages[0];

  const sortedElements = useMemo(
    () => normalizeLayers(activePage?.elements ?? []),
    [activePage?.elements],
  );

  // Top of the layers list = visually on top of the stack
  const layeredElements = useMemo(
    () => [...sortedElements].reverse(),
    [sortedElements],
  );

  const selectedElement =
    activePage?.elements.find((element) => element.id === selectedElementId) ??
    null;

  // Auto-fit the canvas to the available viewport.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !autoFit) return;

    const computeFit = (width: number, height: number) => {
      const padX = 64;
      const padY = 96;
      const fit = Math.min(
        (width - padX) / template.width,
        (height - padY) / template.height,
      );
      const next = Math.max(MIN_ZOOM, Math.min(1, fit));
      setScale(Number.isFinite(next) ? next : 1);
    };

    const rect = viewport.getBoundingClientRect();
    computeFit(rect.width, rect.height);

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      computeFit(width, height);
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, [autoFit, template.height, template.width]);

  // Debounced autosave for the draft document.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    setSaveStatus("saving");
    const timeout = window.setTimeout(async () => {
      const result = await saveDraftAction(template.id, doc);
      if (result.error) {
        setSaveStatus("error");
        setMessage(result.error);
        return;
      }
      setSaveStatus("saved");
      setMessage(null);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [doc, template.id]);

  // Close the canvas context menu on any outside click.
  useEffect(() => {
    function close() {
      setContextMenu(null);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  function updateActivePage(updater: (page: TemplatePage) => TemplatePage) {
    setDoc((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === activePage?.id ? updater(page) : page,
      ),
    }));
  }

  function updatePageById(
    pageId: string,
    updater: (page: TemplatePage) => TemplatePage,
  ) {
    setDoc((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId ? updater(page) : page,
      ),
    }));
  }

  function addPage() {
    const page = createPage(doc.pages.length + 1);
    setDoc((current) => ({ ...current, pages: [...current.pages, page] }));
    setActivePageId(page.id);
    setSelectedElementId(null);
  }

  function removePage(pageId: string) {
    if (doc.pages.length === 1) return;

    const nextPages = doc.pages.filter((page) => page.id !== pageId);
    setDoc((current) => ({ ...current, pages: nextPages }));
    if (pageId === activePageId) {
      setActivePageId(nextPages[0]?.id ?? "");
      setSelectedElementId(null);
    }
  }

  function renamePage(pageId: string, title: string) {
    updatePageById(pageId, (page) => ({ ...page, title }));
  }

  function updateSelectedElementProps(props: Record<string, unknown>) {
    if (!selectedElement) return;
    updateActivePage((page) => ({
      ...page,
      elements: page.elements.map((element) =>
        element.id === selectedElement.id ? { ...element, props } : element,
      ),
    }));
  }

  function updateSelectedElementPosition(x: number, y: number) {
    if (!selectedElement) return;
    updateActivePage((page) => ({
      ...page,
      elements: page.elements.map((element) =>
        element.id === selectedElement.id
          ? {
              ...element,
              x: Math.max(0, Math.round(x)),
              y: Math.max(0, Math.round(y)),
            }
          : element,
      ),
    }));
  }

  function deleteElement(elementId: string) {
    updateActivePage((page) => ({
      ...page,
      elements: page.elements.filter((element) => element.id !== elementId),
    }));
    if (elementId === selectedElementId) {
      setSelectedElementId(null);
    }
  }

  function addElement(type: TemplateElementType, x: number, y: number) {
    const definition = getElementDefinition(type);
    const maxZIndex = Math.max(
      -1,
      ...(activePage?.elements.map((element) => element.zIndex) ?? []),
    );
    const element: TemplateElement = {
      id: crypto.randomUUID(),
      type,
      x: Math.max(0, Math.round(x)),
      y: Math.max(0, Math.round(y)),
      zIndex: maxZIndex + 1,
      props: definition.defaultProps,
    };

    updateActivePage((page) => ({
      ...page,
      elements: [...page.elements, element],
    }));
    setSelectedElementId(element.id);
  }

  function moveElement(elementId: string, deltaX: number, deltaY: number) {
    updateActivePage((page) => ({
      ...page,
      elements: page.elements.map((element) =>
        element.id === elementId
          ? {
              ...element,
              x: Math.max(0, Math.round(element.x + deltaX / scale)),
              y: Math.max(0, Math.round(element.y + deltaY / scale)),
            }
          : element,
      ),
    }));
  }

  function adjustLayer(action: LayerAction, elementId?: string) {
    const targetId = elementId ?? selectedElementId;
    if (!targetId) return;

    updateActivePage((page) => {
      const ordered = normalizeLayers(page.elements);
      const index = ordered.findIndex((element) => element.id === targetId);
      if (index === -1) return page;

      if (action === "front") {
        ordered[index] = { ...ordered[index], zIndex: ordered.length };
        return { ...page, elements: normalizeLayers(ordered) };
      }
      if (action === "back") {
        ordered[index] = { ...ordered[index], zIndex: -1 };
        return { ...page, elements: normalizeLayers(ordered) };
      }

      const targetIndex = action === "forward" ? index + 1 : index - 1;
      if (!ordered[targetIndex]) return page;
      const currentZ = ordered[index].zIndex;
      ordered[index] = {
        ...ordered[index],
        zIndex: ordered[targetIndex].zIndex,
      };
      ordered[targetIndex] = { ...ordered[targetIndex], zIndex: currentZ };

      return { ...page, elements: normalizeLayers(ordered) };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const dragData = getDragData(event);
    if (!dragData) return;

    if (dragData.kind === "element") {
      moveElement(dragData.elementId, event.delta.x, event.delta.y);
      return;
    }

    if (event.over?.id !== "canvas" || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const translated = event.active.rect.current.translated;
    if (!translated) return;

    const x = (translated.left + translated.width / 2 - rect.left) / scale;
    const y = (translated.top + translated.height / 2 - rect.top) / scale;
    addElement(dragData.type, x, y);
  }

  async function handlePublish() {
    setIsPublishing(true);
    setSaveStatus("saving");
    const saveResult = await saveDraftAction(template.id, doc);
    if (saveResult.error) {
      setSaveStatus("error");
      setMessage(saveResult.error);
      setIsPublishing(false);
      return;
    }

    const publishResult = await publishTemplateAction(template.id);
    if (publishResult.error) {
      setSaveStatus("error");
      setMessage(publishResult.error);
      setIsPublishing(false);
      return;
    }

    setSaveStatus("saved");
    setMessage("Published a new version.");
    setIsPublishing(false);
    router.refresh();
  }

  async function handleRestore(version: PublishedVersion) {
    const result = await restoreVersionAction(template.id, version.id);
    if (result.error) {
      setSaveStatus("error");
      setMessage(result.error);
      return;
    }

    setDoc(version.document);
    setActivePageId(version.document.pages[0]?.id ?? "");
    setSelectedElementId(null);
    setSaveStatus("saved");
    setMessage(`Restored version ${version.version} to the draft.`);
    router.refresh();
  }

  function changeScale(next: number) {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
    setAutoFit(false);
    setScale(clamped);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isFormField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isFormField) return;

      if (event.key === "Escape") {
        setSelectedElementId(null);
        setContextMenu(null);
        return;
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedElementId
      ) {
        event.preventDefault();
        deleteElement(selectedElementId);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId]);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <TooltipProvider delay={250}>
        <section className="flex h-[calc(100svh-3.5rem)] flex-col bg-background">
          <EditorToolbar
            template={template}
            saveStatus={saveStatus}
            message={message}
            versions={versions}
            isPublishing={isPublishing}
            onPublish={handlePublish}
            onRestore={handleRestore}
          />

          <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)_300px] overflow-hidden">
            <LeftSidebar
              pages={doc.pages}
              activePageId={activePage?.id}
              elements={layeredElements}
              selectedElementId={selectedElementId}
              onActivePageChange={(pageId) => {
                setActivePageId(pageId);
                setSelectedElementId(null);
              }}
              onAddPage={addPage}
              onRenamePage={renamePage}
              onRemovePage={removePage}
              onSelectElement={setSelectedElementId}
              onDeleteElement={deleteElement}
              onLayerAction={adjustLayer}
            />

            <CanvasArea
              template={template}
              elements={sortedElements}
              selectedElementId={selectedElementId}
              scale={scale}
              autoFit={autoFit}
              viewportRef={viewportRef}
              onCanvasRef={(node) => {
                canvasRef.current = node;
              }}
              onSelect={setSelectedElementId}
              onDeselect={() => {
                setSelectedElementId(null);
                setContextMenu(null);
              }}
              onContextMenu={(event, elementId) => {
                event.preventDefault();
                event.stopPropagation();
                setSelectedElementId(elementId);
                setContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  elementId,
                });
              }}
              onZoomIn={() => changeScale(scale + 0.1)}
              onZoomOut={() => changeScale(scale - 0.1)}
              onSetZoom={changeScale}
              onFit={() => setAutoFit(true)}
            />

            <RightSidebar
              template={template}
              selectedElement={selectedElement}
              onChangeProps={updateSelectedElementProps}
              onChangePosition={updateSelectedElementPosition}
              onLayerAction={(action) => adjustLayer(action)}
              onDelete={() =>
                selectedElement && deleteElement(selectedElement.id)
              }
            />
          </div>

          {contextMenu ? (
            <LayerContextMenu
              menu={contextMenu}
              onAction={(action) => adjustLayer(action, contextMenu.elementId)}
              onClose={() => setContextMenu(null)}
            />
          ) : null}
        </section>
      </TooltipProvider>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

type EditorToolbarProps = {
  template: EditorTemplate;
  saveStatus: SaveStatus;
  message: string | null;
  versions: PublishedVersion[];
  isPublishing: boolean;
  onPublish: () => void;
  onRestore: (version: PublishedVersion) => void;
};

function EditorToolbar({
  template,
  saveStatus,
  message,
  versions,
  isPublishing,
  onPublish,
  onRestore,
}: EditorToolbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-card px-3">
      <Button
        size="sm"
        variant="ghost"
        nativeButton={false}
        render={<Link href="/dashboard/templates" />}
      >
        <ArrowLeftIcon />
        Templates
      </Button>

      <Separator orientation="vertical" className="h-5" />

      <div className="flex min-w-0 flex-col">
        <h1 className="truncate text-sm font-medium leading-none">
          {template.name}
        </h1>
        <span className="text-xs leading-none text-muted-foreground tabular-nums">
          {template.width.toLocaleString()} ×{" "}
          {template.height.toLocaleString()} px
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <SaveStatusPill status={saveStatus} message={message} />
        <VersionsSheet
          versions={versions}
          template={template}
          onRestore={onRestore}
        />
        <Button type="button" onClick={onPublish} disabled={isPublishing}>
          {isPublishing
            ? "Publishing..."
            : versions.length === 0
              ? "Publish"
              : "Publish new version"}
        </Button>
      </div>
    </header>
  );
}

function SaveStatusPill({
  status,
  message,
}: {
  status: SaveStatus;
  message: string | null;
}) {
  const icon =
    status === "error" ? (
      <WarningCircleIcon className="text-destructive" />
    ) : status === "saving" ? (
      <ClockCounterClockwiseIcon className="text-muted-foreground" />
    ) : (
      <CheckCircleIcon className="text-emerald-500" />
    );
  const label =
    message ??
    (status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "All changes saved"
        : "Save failed");

  return (
    <div
      className={cn(
        "hidden h-7 items-center gap-1.5 rounded-full border bg-background px-2.5 text-xs text-muted-foreground sm:flex",
        status === "error" && "border-destructive/40 text-destructive",
      )}
    >
      <span className="flex size-3.5 items-center justify-center [&>svg]:size-3.5">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function VersionsSheet({
  versions,
  template,
  onRestore,
}: {
  versions: PublishedVersion[];
  template: EditorTemplate;
  onRestore: (version: PublishedVersion) => void;
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <ClockCounterClockwiseIcon />
            History
            {versions.length > 0 ? (
              <span className="text-muted-foreground tabular-nums">
                {versions.length}
              </span>
            ) : null}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full max-w-md sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Version history</SheetTitle>
          <SheetDescription>
            Every published snapshot of {template.name}. Restoring loads the
            snapshot into the draft — it doesn’t auto-publish.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ClockCounterClockwiseIcon className="size-5" />
              </div>
              <p className="text-sm font-medium">No versions yet</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Publish the draft to capture the first version. Earlier versions
                will appear here.
              </p>
            </div>
          ) : (
            <ol className="flex flex-col gap-2 py-3">
              {versions.map((version, index) => {
                const isLatest = index === 0;
                return (
                  <li
                    key={version.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border bg-background p-3",
                      isLatest && "border-primary/30 bg-primary/5",
                    )}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        Version {version.version}
                        {isLatest ? (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                            Latest
                          </span>
                        ) : null}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {formatVersionDate(version.publishedAt)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onRestore(version)}
                    >
                      Restore
                    </Button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Left sidebar
// ---------------------------------------------------------------------------

type LeftSidebarProps = {
  pages: TemplatePage[];
  activePageId: string | undefined;
  elements: TemplateElement[];
  selectedElementId: string | null;
  onActivePageChange: (pageId: string) => void;
  onAddPage: () => void;
  onRenamePage: (pageId: string, title: string) => void;
  onRemovePage: (pageId: string) => void;
  onSelectElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onLayerAction: (action: LayerAction, elementId: string) => void;
};

function LeftSidebar({
  pages,
  activePageId,
  elements,
  selectedElementId,
  onActivePageChange,
  onAddPage,
  onRenamePage,
  onRemovePage,
  onSelectElement,
  onDeleteElement,
  onLayerAction,
}: LeftSidebarProps) {
  return (
    <aside className="flex min-h-0 flex-col border-r bg-card">
      <Section
        title="Pages"
        icon={<FilesIcon />}
        action={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onClick={onAddPage}
                />
              }
            >
              <PlusIcon />
              <span className="sr-only">Add page</span>
            </TooltipTrigger>
            <TooltipContent>New page</TooltipContent>
          </Tooltip>
        }
      >
        <PageList
          pages={pages}
          activePageId={activePageId}
          onSelect={onActivePageChange}
          onRename={onRenamePage}
          onRemove={onRemovePage}
          canRemove={pages.length > 1}
        />
      </Section>

      <Section title="Layers" icon={<StackIcon />}>
        {elements.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No elements on this page yet.
          </p>
        ) : (
          <LayerList
            elements={elements}
            selectedElementId={selectedElementId}
            onSelect={onSelectElement}
            onDelete={onDeleteElement}
            onLayerAction={onLayerAction}
          />
        )}
      </Section>

      <Section title="Add element" icon={<StackPlusIcon />} grow>
        <ElementsPalette />
      </Section>
    </aside>
  );
}

function Section({
  title,
  icon,
  action,
  grow,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  grow?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col border-b last:border-b-0",
        grow && "flex-1",
      )}
    >
      <div className="flex h-9 shrink-0 items-center gap-2 px-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground [&>svg]:size-3.5">
          {icon}
          {title}
        </span>
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">{children}</div>
    </div>
  );
}

function PageList({
  pages,
  activePageId,
  onSelect,
  onRename,
  onRemove,
  canRemove,
}: {
  pages: TemplatePage[];
  activePageId: string | undefined;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);

  return (
    <ul className="flex flex-col gap-0.5">
      {pages.map((page, index) => {
        const isActive = page.id === activePageId;
        const isRenaming = renamingId === page.id;
        const indexBadge = (
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold tabular-nums",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {index + 1}
          </span>
        );

        return (
          <li key={page.id}>
            <div
              className={cn(
                "group/page flex h-8 items-center gap-1.5 rounded-md px-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {isRenaming ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {indexBadge}
                  <Input
                    autoFocus
                    className="h-6 px-1.5 py-0 text-sm"
                    defaultValue={page.title ?? ""}
                    onBlur={(event) => {
                      onRename(
                        page.id,
                        event.currentTarget.value.trim() || `Page ${index + 1}`,
                      );
                      setRenamingId(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      } else if (event.key === "Escape") {
                        setRenamingId(null);
                      }
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => onSelect(page.id)}
                  onDoubleClick={() => setRenamingId(page.id)}
                >
                  {indexBadge}
                  <span className="truncate">
                    {page.title || `Page ${index + 1}`}
                  </span>
                </button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="opacity-0 group-hover/page:opacity-100 aria-expanded:opacity-100"
                    />
                  }
                >
                  <DotsThreeIcon />
                  <span className="sr-only">Page menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setRenamingId(page.id)}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={!canRemove}
                    onClick={() => onRemove(page.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function LayerList({
  elements,
  selectedElementId,
  onSelect,
  onDelete,
  onLayerAction,
}: {
  elements: TemplateElement[];
  selectedElementId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onLayerAction: (action: LayerAction, elementId: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {elements.map((element) => {
        const definition = getElementDefinition(element.type);
        const Icon = ELEMENT_ICONS[element.type];
        const isSelected = element.id === selectedElementId;
        const label = describeElement(element, definition.label);

        return (
          <li key={element.id}>
            <div
              className={cn(
                "group/layer flex h-8 items-center gap-1.5 rounded-md px-2 text-sm transition-colors",
                isSelected
                  ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => onSelect(element.id)}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{label}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {definition.label}
                </span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="opacity-0 group-hover/layer:opacity-100 aria-expanded:opacity-100"
                    />
                  }
                >
                  <DotsThreeIcon />
                  <span className="sr-only">Layer actions</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onLayerAction("front", element.id)}
                  >
                    <ArrowLineUpIcon />
                    Bring to front
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onLayerAction("forward", element.id)}
                  >
                    <StackPlusIcon />
                    Bring forward
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onLayerAction("backward", element.id)}
                  >
                    <StackSimpleIcon />
                    Send backward
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onLayerAction("back", element.id)}
                  >
                    <ArrowLineDownIcon />
                    Send to back
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(element.id)}
                  >
                    <TrashIcon />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ElementsPalette() {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <p className="px-1 text-xs text-muted-foreground">
        Drag onto the canvas to add.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {PALETTE_TYPES.map((type) => (
          <PaletteItem key={type} type={type} />
        ))}
      </div>
    </div>
  );
}

function PaletteItem({ type }: { type: TemplateElementType }) {
  const definition = elementDefinitions[type];
  const Icon = ELEMENT_ICONS[type];
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette:${type}`,
      data: { kind: "palette", type } satisfies DragData,
    });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        "flex aspect-[5/3] flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-background text-xs font-medium text-muted-foreground transition-colors hover:border-solid hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
        "[&>svg]:size-5",
        isDragging && "border-solid border-primary/50 opacity-50",
      )}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
      {...listeners}
      {...attributes}
    >
      <Icon />
      {definition.label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

type CanvasAreaProps = {
  template: EditorTemplate;
  elements: TemplateElement[];
  selectedElementId: string | null;
  scale: number;
  autoFit: boolean;
  viewportRef: React.MutableRefObject<HTMLDivElement | null>;
  onCanvasRef: (node: HTMLDivElement | null) => void;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onContextMenu: (event: MouseEvent, elementId: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (value: number) => void;
  onFit: () => void;
};

function CanvasArea({
  template,
  elements,
  selectedElementId,
  scale,
  autoFit,
  viewportRef,
  onCanvasRef,
  onSelect,
  onDeselect,
  onContextMenu,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onFit,
}: CanvasAreaProps) {
  return (
    <div className="relative flex min-h-0 flex-col bg-muted/40">
      <div
        ref={viewportRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-muted/30"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in oklab, currentColor 14%, transparent) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onMouseDown={onDeselect}
      >
        <CanvasDropZone
          template={template}
          scale={scale}
          elements={elements}
          selectedElementId={selectedElementId}
          onCanvasRef={onCanvasRef}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
        />
      </div>

      <CanvasFooter
        template={template}
        scale={scale}
        autoFit={autoFit}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onSetZoom={onSetZoom}
        onFit={onFit}
      />
    </div>
  );
}

type CanvasDropZoneProps = {
  template: EditorTemplate;
  scale: number;
  elements: TemplateElement[];
  selectedElementId: string | null;
  onCanvasRef: (node: HTMLDivElement | null) => void;
  onSelect: (id: string) => void;
  onContextMenu: (event: MouseEvent, elementId: string) => void;
};

function CanvasDropZone({
  template,
  scale,
  elements,
  selectedElementId,
  onCanvasRef,
  onSelect,
  onContextMenu,
}: CanvasDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  function setRefs(node: HTMLDivElement | null) {
    setNodeRef(node);
    onCanvasRef(node);
  }

  return (
    <div
      style={{
        width: template.width * scale,
        height: template.height * scale,
      }}
    >
      <div
        ref={setRefs}
        className={cn(
          "relative overflow-hidden rounded-sm bg-background shadow-2xl outline outline-1 outline-black/10 transition-shadow",
          isOver && "outline-2 outline-primary",
        )}
        style={{
          width: template.width,
          height: template.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {elements.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <div
              className="flex items-center justify-center rounded-full bg-muted"
              style={{
                width: 96 / scale,
                height: 96 / scale,
              }}
            >
              <CursorIcon style={{ width: 48 / scale, height: 48 / scale }} />
            </div>
            <p
              className="font-medium"
              style={{ fontSize: 28 / scale, lineHeight: 1.2 }}
            >
              Drop elements here
            </p>
            <p style={{ fontSize: 18 / scale, lineHeight: 1.4 }}>
              Drag a Text or Button from the left panel to begin.
            </p>
          </div>
        ) : null}

        {elements.map((element) => (
          <CanvasElement
            key={element.id}
            element={element}
            scale={scale}
            selected={element.id === selectedElementId}
            onSelect={onSelect}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    </div>
  );
}

function CanvasElement({
  element,
  scale,
  selected,
  onSelect,
  onContextMenu,
}: {
  element: TemplateElement;
  scale: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onContextMenu: (event: MouseEvent, elementId: string) => void;
}) {
  const definition = getElementDefinition(element.type);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `element:${element.id}`,
      data: { kind: "element", elementId: element.id } satisfies DragData,
    });
  const style: CSSProperties = {
    left: element.x,
    top: element.y,
    zIndex: element.zIndex,
    transform: transform
      ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)`
      : undefined,
    outlineWidth: selected ? Math.max(2, 2 / scale) : 0,
    outlineOffset: 4 / scale,
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute cursor-move outline outline-primary",
        isDragging && "opacity-80",
      )}
      style={style}
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect(element.id);
      }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => onContextMenu(event, element.id)}
      {...listeners}
      {...attributes}
    >
      <definition.Canvas
        element={{
          ...element,
          props: definition.normalizeProps(element.props),
        }}
      />
    </div>
  );
}

function CanvasFooter({
  template,
  scale,
  autoFit,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onFit,
}: {
  template: EditorTemplate;
  scale: number;
  autoFit: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (value: number) => void;
  onFit: () => void;
}) {
  const percent = Math.round(scale * 100);
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-t bg-card px-3 text-xs">
      <span className="text-muted-foreground tabular-nums">
        {template.width.toLocaleString()} × {template.height.toLocaleString()}
      </span>
      <Separator orientation="vertical" className="h-4" />
      <span className="text-muted-foreground">
        {autoFit ? "Auto-fit" : "Manual"}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={onZoomOut}
                disabled={scale <= MIN_ZOOM}
              />
            }
          >
            <MagnifyingGlassMinusIcon />
            <span className="sr-only">Zoom out</span>
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="min-w-14 justify-center tabular-nums"
              />
            }
          >
            {percent}%
            <CaretDownIcon className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ZOOM_PRESETS.map((preset) => (
              <DropdownMenuItem
                key={preset}
                onClick={() => onSetZoom(preset)}
              >
                {Math.round(preset * 100)}%
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onFit}>
              <ArrowsOutSimpleIcon />
              Fit to viewport
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={onZoomIn}
                disabled={scale >= MAX_ZOOM}
              />
            }
          >
            <MagnifyingGlassPlusIcon />
            <span className="sr-only">Zoom in</span>
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-4" />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={onFit}
              />
            }
          >
            <ArrowsOutSimpleIcon />
            <span className="sr-only">Fit to viewport</span>
          </TooltipTrigger>
          <TooltipContent>Fit to viewport</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right sidebar / properties
// ---------------------------------------------------------------------------

type RightSidebarProps = {
  template: EditorTemplate;
  selectedElement: TemplateElement | null;
  onChangeProps: (props: Record<string, unknown>) => void;
  onChangePosition: (x: number, y: number) => void;
  onLayerAction: (action: LayerAction) => void;
  onDelete: () => void;
};

function RightSidebar({
  template,
  selectedElement,
  onChangeProps,
  onChangePosition,
  onLayerAction,
  onDelete,
}: RightSidebarProps) {
  return (
    <aside className="flex min-h-0 flex-col border-l bg-card">
      {selectedElement ? (
        <PropertiesInspector
          template={template}
          element={selectedElement}
          onChangeProps={onChangeProps}
          onChangePosition={onChangePosition}
          onLayerAction={onLayerAction}
          onDelete={onDelete}
        />
      ) : (
        <PropertiesEmptyState />
      )}
    </aside>
  );
}

function PropertiesEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CursorIcon className="size-5" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">No element selected</p>
        <p className="text-xs text-muted-foreground">
          Select an element on the canvas or in the layers list to edit its
          properties.
        </p>
      </div>
    </div>
  );
}

function PropertiesInspector({
  template,
  element,
  onChangeProps,
  onChangePosition,
  onLayerAction,
  onDelete,
}: {
  template: EditorTemplate;
  element: TemplateElement;
  onChangeProps: (props: Record<string, unknown>) => void;
  onChangePosition: (x: number, y: number) => void;
  onLayerAction: (action: LayerAction) => void;
  onDelete: () => void;
}) {
  const definition = getElementDefinition(element.type);
  const Icon = ELEMENT_ICONS[element.type];
  const normalizedProps = useMemo(
    () => definition.normalizeProps(element.props),
    [definition, element.props],
  );

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium leading-none">
            {definition.label}
          </span>
          <span className="text-[11px] text-muted-foreground leading-none">
            {describeElement(element, "Untitled")}
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="ml-auto"
                onClick={onDelete}
              />
            }
          >
            <TrashIcon />
            <span className="sr-only">Delete element</span>
          </TooltipTrigger>
          <TooltipContent>Delete element (Del)</TooltipContent>
        </Tooltip>
      </header>

      <div className="flex flex-1 flex-col gap-0 overflow-y-auto">
        <PropertyGroup title="Position">
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              id="prop-x"
              label="X"
              value={element.x}
              min={0}
              max={template.width}
              onChange={(value) => onChangePosition(value, element.y)}
            />
            <NumberField
              id="prop-y"
              label="Y"
              value={element.y}
              min={0}
              max={template.height}
              onChange={(value) => onChangePosition(element.x, value)}
            />
          </div>
        </PropertyGroup>

        <PropertyGroup title="Layer">
          <div className="flex items-center gap-1">
            <LayerButton
              tooltip="Bring to front"
              onClick={() => onLayerAction("front")}
            >
              <ArrowLineUpIcon />
            </LayerButton>
            <LayerButton
              tooltip="Bring forward"
              onClick={() => onLayerAction("forward")}
            >
              <StackPlusIcon />
            </LayerButton>
            <LayerButton
              tooltip="Send backward"
              onClick={() => onLayerAction("backward")}
            >
              <StackSimpleIcon />
            </LayerButton>
            <LayerButton
              tooltip="Send to back"
              onClick={() => onLayerAction("back")}
            >
              <ArrowLineDownIcon />
            </LayerButton>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              z {element.zIndex}
            </span>
          </div>
        </PropertyGroup>

        <PropertyGroup title={definition.label}>
          <definition.PropertiesPanel
            element={{ ...element, props: normalizedProps }}
            onChange={onChangeProps}
          />
        </PropertyGroup>
      </div>
    </>
  );
}

function PropertyGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b px-3 py-3 last:border-b-0">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <Input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number.parseFloat(event.currentTarget.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </label>
  );
}

function LayerButton({
  tooltip,
  onClick,
  children,
}: {
  tooltip: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={onClick}
          />
        }
      >
        {children}
        <span className="sr-only">{tooltip}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Context menu (right-click on canvas / layers)
// ---------------------------------------------------------------------------

function LayerContextMenu({
  menu,
  onAction,
  onClose,
}: {
  menu: ContextMenuState;
  onAction: (action: LayerAction) => void;
  onClose: () => void;
}) {
  const actions: Array<{
    label: string;
    value: LayerAction;
    icon: ReactNode;
    shortcut?: string;
  }> = [
    {
      label: "Bring to front",
      value: "front",
      icon: <ArrowLineUpIcon />,
    },
    {
      label: "Bring forward",
      value: "forward",
      icon: <StackPlusIcon />,
    },
    {
      label: "Send backward",
      value: "backward",
      icon: <StackSimpleIcon />,
    },
    {
      label: "Send to back",
      value: "back",
      icon: <ArrowLineDownIcon />,
    },
  ];

  return (
    <div
      className="fixed z-50 min-w-48 rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {actions.map((action) => (
        <button
          key={action.value}
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground [&>svg]:size-4 [&>svg]:text-muted-foreground"
          onClick={() => {
            onAction(action.value);
            onClose();
          }}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
}

