import { Header } from "@/components/layout/Header";
import { MarketsList } from "@/components/markets/MarketsList";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Prediction Markets
          </h1>
          <p className="text-lg text-[#a1a1aa] max-w-2xl mx-auto">
            Trade on real-world events. Put your knowledge to work and earn from your predictions.
          </p>
        </div>

        {/* Featured Markets */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Featured Markets</h2>
          <MarketsList featured limit={6} />
        </section>

        {/* All Markets */}
        <section>
          <h2 className="text-2xl font-bold mb-6">All Markets</h2>
          <MarketsList limit={12} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272a] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[#71717a] text-sm">
              Powered by Polymarket Builder Program
            </p>
            <div className="flex gap-6 text-sm text-[#a1a1aa]">
              <a href="https://docs.polymarket.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Docs
              </a>
              <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Polymarket
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
