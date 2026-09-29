import { Bar, GridSkeleton, LoadingRegion } from '@/components/site/Skeleton'

/** Shown the moment a visitor heads to the home page, until the real page arrives. */
export default function HomeLoading() {
  return (
    <LoadingRegion testId="home-skeleton">
      <div className="flex flex-col gap-12 sm:gap-14">
        <section className="home-hero relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-10 sm:py-12">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_260px] lg:grid-cols-[1fr_300px]">
            <div className="flex max-w-2xl flex-col gap-4">
              <Bar className="h-4 w-48" />
              <Bar className="h-9 w-4/5 sm:h-11" />
              <Bar className="h-9 w-3/5 sm:h-11" />
              <Bar className="mt-2 h-5 w-full max-w-prose" />
              <Bar className="h-5 w-2/3" />
              <div className="mt-4 flex flex-wrap gap-3">
                <Bar className="h-12 w-40 rounded-full" />
                <Bar className="h-12 w-56 rounded-full" />
              </div>
            </div>
            <div className="hero-piece mx-auto w-full max-w-[300px] rounded-[1.75rem] bg-surface p-3 shadow-card-hover">
              <div className="aspect-[4/3] rounded-[1.25rem] bg-white md:aspect-square" />
              <div className="flex flex-col gap-2 px-2 pb-2 pt-4">
                <Bar className="h-3 w-24" />
                <Bar className="h-4 w-40" />
                <Bar className="h-4 w-20" />
              </div>
            </div>
          </div>
        </section>
        <section>
          <Bar className="h-7 w-36" />
          <div className="mt-5 flex flex-wrap gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Bar key={i} className="h-14 w-32 rounded-2xl" />
            ))}
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between">
            <Bar className="h-7 w-44" />
            <Bar className="h-4 w-28" />
          </div>
          <div className="mt-5">
            <GridSkeleton count={4} columns="md:grid-cols-3 xl:grid-cols-4" />
          </div>
        </section>
        <section className="panel-lilac p-6 sm:p-8">
          <Bar className="h-7 w-40" />
          <Bar className="mt-3 h-4 w-full max-w-xl" />
          <Bar className="mt-2 h-4 w-2/3 max-w-md" />
          <Bar className="mt-6 h-12 w-72 max-w-full rounded-xl" />
        </section>
      </div>
    </LoadingRegion>
  )
}
