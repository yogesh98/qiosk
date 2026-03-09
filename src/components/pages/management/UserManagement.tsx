import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  Delete02Icon,
  GroupIcon,
  PencilEdit01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import type {
  listUsersFn} from '@/utils/users/users.functions';
import {
  createUserFn,
  deleteUserFn,
  updateUserFn,
} from '@/utils/users/users.functions'
import { Route } from '@/routes/_authed/management/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'

type User = Awaited<ReturnType<typeof listUsersFn>>[number]

const ROLES = [
  { value: 'creator', label: 'Creator' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'admin', label: 'Admin' },
] as const

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function UserManagement() {
  const { users, currentUserId } = Route.useLoaderData()
  const router = useRouter()
  const refreshUsers = () => router.invalidate({ sync: true })
  const pendingCount = users.filter((u) => !u.isApproved).length

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">User Management</h1>
          <p className="text-xs text-muted-foreground">
            {users.length} {users.length === 1 ? 'user' : 'users'}
            {pendingCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {' '}
                &middot; {pendingCount} pending approval
              </span>
            )}
          </p>
        </div>
        <CreateUserDialog onCreated={refreshUsers} />
      </div>

      <div className="mt-6">
        {users.length === 0 ? (
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={GroupIcon} />
              </EmptyMedia>
              <EmptyTitle>No users yet</EmptyTitle>
              <EmptyDescription>
                Create a user or wait for someone to sign up.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    currentUserId={currentUserId}
                    onMutated={refreshUsers}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

function UserRow({
  user,
  currentUserId,
  onMutated,
}: {
  user: User
  currentUserId: string
  onMutated: () => Promise<void>
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const isSelf = user.id === currentUserId

  return (
    <TableRow>
      <TableCell className="font-medium">{user.email}</TableCell>
      <TableCell>
        <Badge variant="outline">{user.role}</Badge>
      </TableCell>
      <TableCell>
        {user.isApproved ? (
          <Badge variant="default">Approved</Badge>
        ) : (
          <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
            Pending
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(user.createdAt)}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Actions" />
            }
          >
            <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
              <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} />
              Edit
            </DropdownMenuItem>
            {!user.isApproved && (
              <ApproveMenuItem user={user} onSuccess={onMutated} />
            )}
            <DropdownMenuItem
              variant="destructive"
              disabled={isSelf}
              onClick={() => {
                if (!isSelf) setDeleteDialogOpen(true)
              }}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <EditDialog
          user={user}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={async () => {
            setEditDialogOpen(false)
            await onMutated()
          }}
        />

        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete user?</AlertDialogTitle>
              <AlertDialogDescription>
                {user.email} will be permanently removed. This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={async () => {
                  try {
                    await deleteUserFn({ data: { id: user.id } })
                    toast.success(`Deleted ${user.email}`)
                    setDeleteDialogOpen(false)
                    await onMutated()
                  } catch (err) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : 'Failed to delete user',
                    )
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

function EditDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => Promise<void>
}) {
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState<(typeof ROLES)[number]['value']>(
    user.role as (typeof ROLES)[number]['value'],
  )
  const [isApproved, setIsApproved] = useState(user.isApproved)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmail(user.email)
      setRole(user.role as (typeof ROLES)[number]['value'])
      setIsApproved(user.isApproved)
      setError(null)
    }
  }, [open, user])

  function reset() {
    setEmail(user.email)
    setRole(user.role as (typeof ROLES)[number]['value'])
    setIsApproved(user.isApproved)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await updateUserFn({
        data: { id: user.id, email, role, isApproved },
      })
      toast.success(`Updated ${email}`)
      await onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update email, role, or approval status.
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
              <FieldLabel htmlFor="edit-email">Email</FieldLabel>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={!!error}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-role">Role</FieldLabel>
              <NativeSelect
                id="edit-role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as (typeof ROLES)[number]['value'])
                }
              >
                {ROLES.map((r) => (
                  <NativeSelectOption key={r.value} value={r.value}>
                    {r.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="edit-approved">Approved</FieldLabel>
                <Switch
                  id="edit-approved"
                  checked={isApproved}
                  onCheckedChange={setIsApproved}
                />
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner /> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CreateUserDialog({ onCreated }: { onCreated: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>('creator')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function resetForm() {
    setEmail('')
    setPassword('')
    setRole('creator')
    setError(null)
    setFieldErrors({})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setSubmitting(true)
    try {
      await createUserFn({
        data: {
          email,
          password,
          role: role as 'admin' | 'publisher' | 'creator',
        },
      })
      toast.success(`Created user ${email}`)
      setOpen(false)
      resetForm()
      await onCreated()
    } catch (err) {
      if (err instanceof Error && err.message.includes('Unique constraint')) {
        setFieldErrors({ email: 'A user with this email already exists' })
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <HugeiconsIcon
          icon={Add01Icon}
          data-icon="inline-start"
          strokeWidth={2}
        />
        New User
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            The user will be pre-approved and can log in immediately.
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
              <FieldLabel htmlFor="create-email">Email</FieldLabel>
              <Input
                id="create-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <FieldError>{fieldErrors.email}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="create-password">Password</FieldLabel>
              <Input
                id="create-password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                aria-invalid={!!fieldErrors.password}
              />
              {fieldErrors.password && (
                <FieldError>{fieldErrors.password}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="create-role">Role</FieldLabel>
              <NativeSelect
                id="create-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <NativeSelectOption key={r.value} value={r.value}>
                    {r.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner /> : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ApproveMenuItem({
  user,
  onSuccess,
}: {
  user: User
  onSuccess: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  async function handleApprove() {
    setLoading(true)
    try {
      await updateUserFn({
        data: { id: user.id, isApproved: true },
      })
      toast.success(`Approved ${user.email}`)
      await onSuccess()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to approve user',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenuItem onClick={() => handleApprove()} disabled={loading}>
      {loading ? (
        <>
          <Spinner />
          Approving…
        </>
      ) : (
        <>
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
          Approve
        </>
      )}
    </DropdownMenuItem>
  )
}
