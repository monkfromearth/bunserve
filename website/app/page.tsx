export default function HomePage() {
  return (
    <main className="flex h-screen flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-2xl font-bold">BunServe Documentation</h1>
      <p className="text-fd-muted-foreground">
        <a href="/docs" className="text-fd-foreground underline">
          Go to Documentation →
        </a>
      </p>
    </main>
  );
}
