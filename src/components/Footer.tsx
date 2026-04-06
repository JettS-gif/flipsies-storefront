import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-brand-charcoal text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-brand-yellow rounded-lg flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 20V10C6 7 8 4 12 4C16 4 18 7 18 10V20" stroke="#2D2D2D" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M9 20V14H15V20" stroke="#2D2D2D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="font-bold leading-tight">Flipsies</div>
                <div className="text-[9px] text-gray-400 tracking-widest uppercase -mt-0.5">Furniture</div>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Quality furniture at honest prices. Visit our showrooms in Hoover and Irondale, Alabama.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-300">Shop</h3>
            <ul className="space-y-2.5">
              {['Living Room', 'Bedroom', 'Dining Room', 'Sectionals', 'Mattresses', 'Deals'].map(item => (
                <li key={item}>
                  <Link href={`/shop/${item.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-300">Company</h3>
            <ul className="space-y-2.5">
              {['About Us', 'Locations', 'Financing', 'Delivery', 'Contact'].map(item => (
                <li key={item}>
                  <Link href={`/${item.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Locations */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-300">Locations</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-200">Hoover Showroom</p>
                <p className="text-sm text-gray-400">Mon–Sat 10am–7pm</p>
                <p className="text-sm text-gray-400">Sun 12pm–5pm</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">Irondale Showroom</p>
                <p className="text-sm text-gray-400">Mon–Sat 10am–7pm</p>
                <p className="text-sm text-gray-400">Sun 12pm–5pm</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Flipsies Furniture. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
