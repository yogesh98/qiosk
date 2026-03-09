import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  ComputerIcon,
  Delete02Icon,
  MoreVerticalIcon,
  PencilEdit01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import type { listKioskConfigurationsFn } from '@/utils/kiosk-configurations/kiosk-configurations.functions'
import {
  createKioskConfigurationFn,
  deleteKioskConfigurationFn,
  duplicateKioskConfigurationFn,
  getKioskConfigurationManagementStateFn,
  updateKioskConfigurationNameFn,
} from '@/utils/kiosk-configurations/kiosk-configurations.functions'
import { Route } from '@/routes/_authed/management/configurations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type KioskConfig = Awaited<ReturnType<typeof listKioskConfigurationsFn>>[number]
type KioskManagementState = Awaited<
  ReturnType<typeof getKioskConfigurationManagementStateFn>
>

const RESOLUTION_PRESETS = [
  { label: '1080p (1920×1080)', width: 1920, height: 1080 },
  { label: '4K (3840×2160)', width: 3840, height: 2160 },
  { label: '720p (1280×720)', width: 1280, height: 720 },
  { label: '1080p Portrait (1080×1920)', width: 1080, height: 1920 },
  { label: '4K Portrait (2160×3840)', width: 2160, height: 3840 },
] as const

const LATEST_VERSION_VALUE = '__latest__'

function formatVersionTimestamp(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function KioskConfigurations() {
  const configurations = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const refreshConfigurations = () => router.invalidate({ sync: true })
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(
    () => configurations[0]?.id ?? null,
  )
  const [selectedVersionId, setSelectedVersionId] = useState(LATEST_VERSION_VALUE)
  const [managementState, setManagementState] = useState<KioskManagementState | null>(null)
  const [loadingManagementState, setLoadingManagementState] = useState(false)
  const [duplicatingConfigId, setDuplicatingConfigId] = useState<string | null>(null)
  const selectedConfig = configurations.find((c) => c.id === selectedConfigId)

  useEffect(() => {
    const exists = configurations.some((c) => c.id === selectedConfigId)
    if (!exists && configurations.length > 0) {
      setSelectedConfigId(configurations[0].id)
    } else if (configurations.length === 0) {
      setSelectedConfigId(null)
    }
  }, [configurations, selectedConfigId])

  useEffect(() => {
    setSelectedVersionId(LATEST_VERSION_VALUE)
  }, [selectedConfigId])

  useEffect(() => {
    if (!selectedConfigId) {
      setManagementState(null)
      return
    }

    let cancelled = false
    setLoadingManagementState(true)
    setManagementState(null)

    getKioskConfigurationManagementStateFn({
      data: { id: selectedConfigId },
    })
      .then((nextState) => {
        if (cancelled) return
        setManagementState(nextState)
      })
      .catch(() => {
        if (cancelled) return
        setManagementState(null)
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingManagementState(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedConfigId, selectedConfig?.currentVersion?.id])

  const previewVersion = useMemo(() => {
    if (!managementState) return null
    if (selectedVersionId === LATEST_VERSION_VALUE) {
      return managementState.currentVersion
    }
    return managementState.versions.find((version) => version.id === selectedVersionId) ?? null
  }, [managementState, selectedVersionId])

  useEffect(() => {
    if (!managementState) return
    if (selectedVersionId === LATEST_VERSION_VALUE) return

    const versionStillExists = managementState.versions.some(
      (version) => version.id === selectedVersionId,
    )

    if (!versionStillExists) {
      setSelectedVersionId(LATEST_VERSION_VALUE)
    }
  }, [managementState, selectedVersionId])

  const versionOptions = useMemo(
    () => [
      {
        value: LATEST_VERSION_VALUE,
        label: managementState?.currentVersion
          ? `Latest (Current) • v${managementState.currentVersion.version}`
          : 'Latest (Current)',
      },
      ...(managementState?.versions ?? []).map((version) => ({
        value: version.id,
        label: `v${version.version} • ${formatVersionTimestamp(version.createdAt)}`,
      })),
    ],
    [managementState],
  )

  const hasSavedVersions = (managementState?.versions.length ?? 0) > 0
  const isViewingHistoricalVersion =
    selectedVersionId !== LATEST_VERSION_VALUE
    && previewVersion !== null
    && previewVersion.id !== managementState?.currentVersion?.id
  const historicalPreviewVersion = isViewingHistoricalVersion
    ? previewVersion
    : null

  const previewSrc = selectedConfig
    ? selectedVersionId === LATEST_VERSION_VALUE
      ? `/viewer/${selectedConfig.id}`
      : `/viewer/${selectedConfig.id}?versionId=${encodeURIComponent(selectedVersionId)}`
    : null

  async function handleDuplicateConfiguration(config: KioskConfig) {
    setDuplicatingConfigId(config.id)
    try {
      const duplicated = await duplicateKioskConfigurationFn({
        data: { id: config.id },
      })
      await refreshConfigurations()
      setSelectedConfigId(duplicated.id)
      toast.success(`Created "${duplicated.name}"`)
    } catch {
      toast.error('Failed to duplicate configuration')
    } finally {
      setDuplicatingConfigId(null)
    }
  }

  function handleOpenEditor(configId: string, sourceVersionId?: string) {
    navigate({
      to: '/editor/$kioskId',
      params: { kioskId: configId },
      search: sourceVersionId ? { sourceVersionId } : {},
    })
  }

  return (
    <div className="flex h-[calc(100vh-var(--navbar-height,4rem))] overflow-hidden pt-16">
      <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-background">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-lg font-medium">Configurations</h1>
            <p className="text-xs text-muted-foreground">
              {configurations.length} total
            </p>
          </div>
          <CreateDialog onCreated={refreshConfigurations} />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {configurations.length === 0 ? (
            <Empty className="border py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={ComputerIcon} />
                </EmptyMedia>
                <EmptyTitle>No configurations yet</EmptyTitle>
                <EmptyDescription>
                  Create your first kiosk configuration to get started.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-1.5">
              {configurations.map((config) => (
                <ConfigurationRow
                  key={config.id}
                  config={config}
                  isSelected={selectedConfigId === config.id}
                  selectedSourceVersionId={
                    selectedConfigId === config.id
                      ? historicalPreviewVersion?.id
                      : undefined
                  }
                  duplicating={duplicatingConfigId === config.id}
                  versionPicker={
                    selectedConfigId === config.id ? (
                      <SelectedConfigurationVersionPicker
                        loading={loadingManagementState}
                        hasSavedVersions={hasSavedVersions}
                        selectedVersionId={selectedVersionId}
                        versionOptions={versionOptions}
                        onSelectedVersionChange={setSelectedVersionId}
                      />
                    ) : null
                  }
                  onSelect={() => setSelectedConfigId(config.id)}
                  onEdit={(sourceVersionId) =>
                    handleOpenEditor(config.id, sourceVersionId)
                  }
                  onDuplicate={() => handleDuplicateConfiguration(config)}
                  onMutated={refreshConfigurations}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-muted/20">
        {selectedConfig ? (
          <div className="h-full">
            {previewSrc ? (
              <iframe
                key={`${selectedConfig.id}:${selectedVersionId}`}
                title={`Preview: ${selectedConfig.name}`}
                src={previewSrc}
                className="h-full w-full border-0"
                sandbox="allow-same-origin allow-scripts"
              />
            ) : null}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <HugeiconsIcon icon={ComputerIcon} className="size-12 opacity-50" />
            <p className="text-sm font-medium">Select a configuration</p>
            <p className="text-xs">
              Choose one from the list to preview it here
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

function ConfigurationRow({
  config,
  isSelected,
  selectedSourceVersionId,
  duplicating,
  versionPicker,
  onSelect,
  onEdit,
  onDuplicate,
  onMutated,
}: {
  config: KioskConfig
  isSelected: boolean
  selectedSourceVersionId?: string
  duplicating: boolean
  versionPicker: React.ReactNode
  onSelect: () => void
  onEdit: (sourceVersionId?: string) => void
  onDuplicate: () => void
  onMutated: () => Promise<void>
}) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(config.name)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  async function handleSaveName() {
    const trimmed = editName.trim()
    if (!trimmed || trimmed === config.name) {
      setEditing(false)
      setEditName(config.name)
      return
    }
    setSaving(true)
    try {
      await updateKioskConfigurationNameFn({
        data: { id: config.id, name: trimmed },
      })
      toast.success('Configuration renamed')
      await onMutated()
      setEditing(false)
    } catch {
      toast.error('Failed to rename configuration')
      setEditName(config.name)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteKioskConfigurationFn({ data: { id: config.id } })
      toast.success(`Deleted "${config.name}"`)
      await onMutated()
    } catch {
      toast.error('Failed to delete configuration')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveName()
    } else if (e.key === 'Escape') {
      setEditing(false)
      setEditName(config.name)
    }
  }

  return (
    <div
      className={`rounded-lg px-4 py-3 ring-1 transition-colors ${
        isSelected
          ? 'bg-primary/10 ring-primary/30 dark:bg-primary/15'
          : 'bg-card ring-foreground/10'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="h-6 text-sm"
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleSaveName}
                disabled={saving}
              >
                {saving ? (
                  <Spinner />
                ) : (
                  <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setEditing(false)
                  setEditName(config.name)
                }}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSelect}
              className="w-full rounded-md text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 -m-1 p-1 hover:underline"
            >
              <p className="truncate text-sm font-medium">
                {config.name}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{config.width} × {config.height}</span>
                <span>&middot;</span>
                <span>
                  {config.currentVersion
                    ? `Current v${config.currentVersion.version}`
                    : 'No saved versions'}
                </span>
              </div>
            </button>
          )}
        </div>

        {!editing && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open in editor"
            onClick={() => onEdit(isSelected ? selectedSourceVersionId : undefined)}
          >
            <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} />
          </Button>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Actions"
                />
              }
            >
              <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onEdit(isSelected ? selectedSourceVersionId : undefined)}
              >
                <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} />
                Open in Editor
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  navigate({ to: '/viewer/$configId', params: { configId: config.id } })
                }
              >
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditName(config.name)
                  setEditing(true)
                }}
              >
                <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate} disabled={duplicating}>
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                {duplicating ? 'Duplicating...' : 'Duplicate'}
              </DropdownMenuItem>
              <AlertDialogTrigger
                nativeButton={false}
                render={<DropdownMenuItem variant="destructive" />}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                Delete
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete configuration?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{config.name}&rdquo; will be permanently deleted. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Spinner /> : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {isSelected && versionPicker ? (
        <div className="mt-2">
          {versionPicker}
        </div>
      ) : null}
    </div>
  )
}

function SelectedConfigurationVersionPicker({
  loading,
  hasSavedVersions,
  selectedVersionId,
  versionOptions,
  onSelectedVersionChange,
}: {
  loading: boolean
  hasSavedVersions: boolean
  selectedVersionId: string
  versionOptions: Array<{ value: string; label: string }>
  onSelectedVersionChange: (value: string) => void
}) {
  return (
    <div className="rounded-md">
      {loading ? (
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
          <Spinner className="size-3" />
          Loading versions
        </div>
      ) : hasSavedVersions ? (
        <Select
          items={versionOptions}
          value={selectedVersionId}
          onValueChange={(value) => {
            if (value) {
              onSelectedVersionChange(value)
            }
          }}
        >
          <SelectTrigger className="w-full justify-start bg-background text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {versionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : (
        <p className="px-2 py-1 text-xs text-muted-foreground">
          No saved versions yet
        </p>
      )}
    </div>
  )
}

function CreateDialog({ onCreated }: { onCreated: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function resetForm() {
    setName('')
    setWidth('')
    setHeight('')
    setError(null)
    setFieldErrors({})
  }

  function applyPreset(preset: (typeof RESOLUTION_PRESETS)[number]) {
    setWidth(String(preset.width))
    setHeight(String(preset.height))
    setFieldErrors((prev) => {
      const { width: _, height: __, ...rest } = prev
      return rest
    })
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!name.trim()) {
      errors.name = 'Name is required'
    } else if (name.length > 255) {
      errors.name = 'Name must be 255 characters or fewer'
    }
    const w = Number(width)
    if (!width || !Number.isInteger(w) || w <= 0) {
      errors.width = 'Width must be a positive integer'
    }
    const h = Number(height)
    if (!height || !Number.isInteger(h) || h <= 0) {
      errors.height = 'Height must be a positive integer'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      await createKioskConfigurationFn({
        data: {
          name: name.trim(),
          width: Number(width),
          height: Number(height),
        },
      })
      toast.success(`Created "${name.trim()}"`)
      setOpen(false)
      resetForm()
      await onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      toast.error('Failed to create configuration')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) resetForm()
      }}
    >
      <DialogTrigger
        render={<Button size="sm" />}
      >
        <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" strokeWidth={2} />
        New
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Kiosk Configuration</DialogTitle>
          <DialogDescription>
            Set a name and resolution. Resolution cannot be changed after
            creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <Field>
              <FieldLabel htmlFor="create-name">Name</FieldLabel>
              <Input
                id="create-name"
                type="text"
                placeholder="e.g. Lobby Display"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name && (
                <FieldError>{fieldErrors.name}</FieldError>
              )}
            </Field>

            <div className="flex flex-wrap gap-1.5">
              {RESOLUTION_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="create-width">Width (px)</FieldLabel>
                <Input
                  id="create-width"
                  type="number"
                  inputMode="numeric"
                  placeholder="1920"
                  min={1}
                  step={1}
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  required
                  aria-invalid={!!fieldErrors.width}
                />
                {fieldErrors.width && (
                  <FieldError>{fieldErrors.width}</FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="create-height">Height (px)</FieldLabel>
                <Input
                  id="create-height"
                  type="number"
                  inputMode="numeric"
                  placeholder="1080"
                  min={1}
                  step={1}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  required
                  aria-invalid={!!fieldErrors.height}
                />
                {fieldErrors.height && (
                  <FieldError>{fieldErrors.height}</FieldError>
                )}
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner /> : 'Create Configuration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
