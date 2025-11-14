import { source } from '@/app/source';
import { notFound } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = (page.data as any).body;

  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>{page.data.title}</h1>
      {page.data.description && (
        <p className="text-lg text-muted-foreground">{page.data.description}</p>
      )}
      <MDX />
    </div>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
