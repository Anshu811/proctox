import Hero from "./sections/Hero";

export default function Home() {
  return (
    <main className="w-full pt-16 bg-background">
      <div className="flex flex-col w-full">
        <div className="relative w-full overflow-hidden">
          {/* background glows */}
          <div className="absolute -top-32 left-1/4 w-[620px] h-[620px] bg-primary-container/20 rounded-full blur-[140px] pointer-events-none -z-10"></div>
          <div className="absolute top-48 right-10 w-[480px] h-[480px] bg-secondary-container/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>

          <Hero />
          {/* baaki sections yahan add honge */}
        </div>
      </div>
    </main>
  );
}