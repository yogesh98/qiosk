import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Route } from '@/routes/_authed/management/configurations'
import {
  createKioskConfigurationFn,
  listKioskConfigurationsFn,
  updateKioskConfigurationNameFn,
  deleteKioskConfigurationFn,
} from '@/utils/kiosk-configurations/kiosk-configurations.functions'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  Delete02Icon,
  PencilEdit01Icon,
  ComputerIcon,
  Tick02Icon,
  Cancel01Icon,
  MoreVerticalIcon,
} from '@hugeicons/core-free-icons'
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

type KioskConfig = Awaited<ReturnType<typeof listKioskConfigurationsFn>>[number]

const RESOLUTION_PRESETS = [
  { label: '1080p (1920×1080)', width: 1920, height: 1080 },
  { label: '4K (3840×2160)', width: 3840, height: 2160 },
  { label: '720p (1280×720)', width: 1280, height: 720 },
  { label: '1080p Portrait (1080×1920)', width: 1080, height: 1920 },
  { label: '4K Portrait (2160×3840)', width: 2160, height: 3840 },
] as const

export function KioskConfigurations() {
  const configurations = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">Kiosk Configurations</h1>
          <p className="text-xs text-muted-foreground">
            Manage your kiosk display configurations
          </p>
        </div>
        <CreateDialog onCreated={() => router.invalidate()} />
      </div>

      <div className="mt-6">
        {configurations.length === 0 ? (
          <Empty className="border py-16">
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
          <div className="flex flex-col gap-2">
            {configurations.map((config) => (
              <ConfigurationRow
                key={config.id}
                config={config}
                onMutated={() => router.invalidate()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ConfigurationRow({
  config,
  onMutated,
}: {
  config: KioskConfig
  onMutated: () => void
}) {
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
      onMutated()
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
      onMutated()
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
    <div className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 ring-1 ring-foreground/10">
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
          <p className="truncate text-sm font-medium">{config.name}</p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {config.width} × {config.height}
        </p>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Actions" />
            }
          >
            <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setEditName(config.name)
                setEditing(true)
              }}
            >
              <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} />
              Rename
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
  )
}

function CreateDialog({ onCreated }: { onCreated: () => void }) {
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
      onCreated()
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
        New Configuration
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
