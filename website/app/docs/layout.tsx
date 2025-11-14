import type { ReactNode } from 'react';
import { source } from '@/app/source';

export default function Layout({ children }: { children: ReactNode }) {
  const tree = source.pageTree;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r p-4 hidden md:block">
        <div className="mb-4">
          <a href="/" className="text-xl font-bold">BunServe</a>
        </div>
        <nav className="space-y-1">
          {tree.children?.map((node: any) => (
            <a
              key={node.url}
              href={node.url}
              className="block px-2 py-1 hover:bg-accent rounded"
            >
              {node.name}
            </a>
          ))}
        </nav>
        <div className="mt-8">
          <a
            href="https://github.com/monkfromearth/bunserve"
            className="text-sm text-muted-foreground hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub →
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-4xl">
          {children}
        </div>
      </main>
    </div>
  );
}
