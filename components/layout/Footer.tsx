/**
 * Footer Component
 * Global footer displayed on all pages with Product Hunt badge
 */

import { ProductHuntBadge } from "./ProductHuntBadge";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#27272a] bg-[#0a0a0b] mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Product Hunt Badge */}
        <div className="mb-8">
          <ProductHuntBadge />
        </div>

        {/* Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold mb-4">BetHub</h3>
            <p className="text-sm text-[#a1a1aa]">
              Modern prediction markets trading platform powered by Polymarket
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-[#a1a1aa]">
              <li>
                <a href="https://polymarket.thosoft.xyz" className="hover:text-white transition-colors">
                  Launch App
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#architecture" className="hover:text-white transition-colors">
                  Architecture
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 text-sm">Resources</h4>
            <ul className="space-y-2 text-sm text-[#a1a1aa]">
              <li>
                <a 
                  href="https://docs.polymarket.com/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Polymarket Docs
                </a>
              </li>
              <li>
                <a 
                  href="https://safe.global/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Safe Wallet
                </a>
              </li>
              <li>
                <a 
                  href="https://wagmi.sh/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Wagmi
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold mb-4 text-sm">Connect</h4>
            <ul className="space-y-2 text-sm text-[#a1a1aa]">
              <li>
                <a 
                  href="https://github.com/NumberZeros/open-polymarket" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a 
                  href="https://www.linkedin.com/in/th%E1%BB%8D-nguy%E1%BB%85n-941348360/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a 
                  href="https://www.producthunt.com/products/bethub" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Product Hunt
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#27272a] pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-[#a1a1aa]">
            © {currentYear} BetHub. All rights reserved. | Open Source Project
          </p>
          <div className="flex gap-4 mt-4 md:mt-0 text-sm text-[#a1a1aa]">
            <a href="#privacy" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#terms" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="#disclaimer" className="hover:text-white transition-colors">
              Disclaimer
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
