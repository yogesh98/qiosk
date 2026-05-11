export default function DashboardPage() {
  return (
    <section
      className="flex flex-1 flex-col gap-4 bg-background p-4"
      aria-label="Authenticated"
    >
      <div className="flex min-h-40 flex-col gap-2 border bg-card p-4 text-card-foreground">
        <h2 className="text-lg font-medium">Welcome to Qiosk</h2>
        <p className="text-sm text-muted-foreground">
          Use the sidebar to navigate your dashboard.
        </p>
      </div>
    </section>
  );
}
