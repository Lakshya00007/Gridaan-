import { SkeletonRows } from './_components/ui';

export default function AdminLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-md bg-stone-200 motion-reduce:animate-none" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl border border-stone-200 bg-white motion-reduce:animate-none" />
        ))}
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <SkeletonRows rows={7} />
      </div>
    </div>
  );
}
