'use client'

import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  CreditCard, 
  Package, 
  Printer,
  CheckCircle,
  ArrowRight,
  Zap,
  BarChart,
  Shield,
  Clock
} from 'react-feather'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-transparent to-indigo-100/50 opacity-60"></div>
        
        {/* Floating Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 text-center w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100/80 backdrop-blur-sm rounded-full text-blue-700 text-sm font-medium mb-6 md:mb-8 border border-blue-200 mx-auto">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            100% Gratis untuk Bisnis Indonesia
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4 md:mb-6 tracking-tight leading-[1.1] px-2">
            The POS System Built for{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Modern Businesses
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8 md:mb-10 max-w-2xl md:max-w-3xl mx-auto leading-relaxed px-4">
            Kelola penjualan, inventory, dan pelanggan dalam satu platform yang cepat dan mudah digunakan.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-8 md:mb-12 px-4">
            <Link 
              href="/setup" 
              className="group inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 w-full sm:w-auto"
            >
              Start Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 text-xs sm:text-sm text-gray-500 mb-8 md:mb-12 px-4">
            <div className="flex items-center gap-1.5 md:gap-2">
              <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
              <span className="whitespace-nowrap">Tanpa kartu kredit</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
              <span className="whitespace-nowrap">Setup dalam 2 menit</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
              <span className="whitespace-nowrap">Semua fitur gratis</span>
            </div>
          </div>

          {/* Hero Product Image - Floating Dashboard */}
          <div className="mt-8 md:mt-16 relative w-full">
            <div className="relative mx-auto max-w-[95%] sm:max-w-[90%] md:max-w-5xl">
              {/* Glass Container */}
              <div className="relative bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
                {/* Browser Bar */}
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gray-50/80 border-b border-gray-200/50">
                  <div className="flex gap-1.5 flex-shrink-0">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 text-center min-w-0">
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 bg-white rounded-md text-[10px] sm:text-xs text-gray-400 truncate max-w-full">
                      <Shield size={10} className="flex-shrink-0" />
                      <span className="truncate">aegispos.com/pos</span>
                    </div>
                  </div>
                </div>
                
                {/* Product Screenshot */}
                <div className="relative w-full bg-gray-50">
                  <Image
                    src="/img/point-of-sales.png"
                    alt="AEGIS POS Interface"
                    width={1200}
                    height={800}
                    className="w-full h-auto block"
                    priority
                    loading="eager"
                    onError={(e) => {
                      console.error('Image failed to load:', e);
                    }}
                  />

                  


                  
                </div>
              </div>

              {/* Shadow underneath */}
              <div className="absolute -bottom-4 sm:-bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-4 sm:h-8 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent blur-2xl rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Showcase Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Run Your Store
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Fitur lengkap yang dirancang untuk membantu bisnis Anda tumbuh lebih cepat
            </p>
          </div>

          {/* Feature 1: Point of Sale */}
          <FeatureShowcase
            badge="POINT OF SALE"
            title="Fast & Intuitive POS"
            description="Proses transaksi dalam hitungan detik. Interface yang clean dan mudah digunakan, bahkan untuk kasir baru."
            features={[
              'Quick product search & category filter',
              'Shopping cart dengan quantity control',
              'Member selection & points redemption',
              'Multiple payment methods',
              'Thermal printer integration'
            ]}
            imageSrc="/img/point-of-sales.png"
            imageAlt="POS Interface"
            reverse={false}
          />

          {/* Feature 2: Dashboard Analytics */}
          <FeatureShowcase
            badge="ANALYTICS"
            title="Understand Your Business Performance"
            description="Dashboard real-time dengan insights lengkap untuk mengambil keputusan bisnis yang lebih baik."
            features={[
              'Sales trends & revenue analytics',
              'Payment methods breakdown',
              'Top selling products',
              'Top spending customers',
              'Period-over-period comparisons'
            ]}
            imageSrc="/img/dashboard-1.png"
            imageAlt="Dashboard Analytics"
            reverse={true}
          />

          {/* Feature 3: Order Management */}
          <FeatureShowcase
            badge="ORDERS"
            title="Complete Transaction History"
            description="Kelola dan lacak semua transaksi dengan mudah. Search, filter, dan reprint receipt kapan saja."
            features={[
              'Search by order ID, customer, or payment method',
              'Date range filters (Today, Week, Custom)',
              'Payment method filtering',
              'Order detail view with full breakdown',
              'Receipt reprint functionality'
            ]}
            imageSrc="/img/orders-page.png"
            imageAlt="Orders Management"
            reverse={false}
          />

          {/* Feature 4: Customer Loyalty */}
          <FeatureShowcase
            badge="LOYALTY PROGRAM"
            title="Build Customer Loyalty"
            description="Sistem points otomatis untuk meningkatkan customer retention dan repeat purchases."
            features={[
              'Automatic points earning (1 pt per Rp 10,000)',
              'Points redemption for discounts',
              'Member purchase history tracking',
              'Top customer leaderboard',
              'Quick member add from POS'
            ]}
            imageSrc="/img/top-members.png"
            imageAlt="Customer Loyalty"
            reverse={true}
          />

          {/* Feature 5: Product Insights */}
          <FeatureShowcase
            badge="INVENTORY"
            title="Discover Your Best Selling Products"
            description="Track product performance dan stock secara real-time untuk inventory management yang lebih baik."
            features={[
              'Best selling products ranking',
              'Stock level monitoring',
              'Low stock alerts',
              'Product category management',
              'Price & stock updates'
            ]}
            imageSrc="/img/top-product.png"
            imageAlt="Product Insights"
            reverse={false}
          />

          {/* Feature 6: Receipt Printing */}
          <FeatureShowcase
            badge="PRINTING"
            title="Professional Receipt Printing"
            description="Cetak struk thermal profesional dengan custom header dan footer sesuai branding bisnis Anda."
            features={[
              'Support 58mm & 80mm thermal printers',
              'Customizable header & footer',
              'Live receipt preview',
              'Auto-print after checkout',
              'Browser-based printing (no drivers)'
            ]}
            imageSrc="/img/receipt-preview.png"
            imageAlt="Receipt Printing"
            reverse={true}
          />
        </div>
      </section>

      {/* POS Feature Highlight */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-6">
                <Zap size={14} className="fill-blue-600" />
                LIGHTNING FAST
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
                Lightning Fast Checkout
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Kasir dapat menambahkan produk, mengatur jumlah item, dan menyelesaikan pembayaran hanya dalam beberapa detik.
              </p>
              
              <div className="space-y-4">
                <FeatureItem icon={ShoppingBag} text="Quick product search & category filter" />
                <FeatureItem icon={CreditCard} text="Multiple payment methods (Cash, Card, E-wallet)" />
                <FeatureItem icon={Users} text="Member selection with points calculation" />
                <FeatureItem icon={Printer} text="Auto-print receipt after payment" />
              </div>
            </div>

            <div className="relative">
              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                <Image
                  src="/img/simple-cart.png"
                  alt="POS Cart Interface"
                  width={800}
                  height={600}
                  className="w-full h-auto"
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Analytics Highlight */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 rounded-full text-indigo-700 text-sm font-medium mb-6">
              <BarChart size={14} />
              REAL-TIME ANALYTICS
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Understand Your Business Performance
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Dashboard lengkap dengan insights real-time untuk mengambil keputusan bisnis yang lebih baik
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <AnalyticsCard
              imageSrc="/img/dashboard-1.png"
              title="Sales Trends"
              description="Monitor penjualan per jam atau per hari dengan visualisasi yang jelas"
            />
            <AnalyticsCard
              imageSrc="/img/dashboard-2.png"
              title="Revenue Analytics"
              description="Track revenue dengan period-over-period comparisons"
            />
            <AnalyticsCard
              imageSrc="/img/dashboard-3.png"
              title="Business Insights"
              description="Payment methods, top products, dan customer analytics"
            />
          </div>
        </div>
      </section>

      {/* Receipt Printing Highlight */}
      <section className="py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid gap-6">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                  <Image
                    src="/img/receipt-preview.png"
                    alt="Receipt Preview"
                    width={600}
                    height={800}
                    className="w-full h-auto"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform">
                    <Image
                      src="/img/cetak-struk.png"
                      alt="Print Modal"
                      width={300}
                      height={400}
                      className="w-full h-auto object-cover scale-[1.05]"
                      style={{ objectPosition: 'center' }}
                    />
                  </div>
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform">
                    <Image
                      src="/img/receipt-setting.png"
                      alt="Receipt Settings"
                      width={300}
                      height={400}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 rounded-full text-indigo-700 text-sm font-medium mb-6">
                <Printer size={14} />
                THERMAL PRINTING
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
                Professional Receipt Printing
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Cetak struk thermal profesional dengan custom header dan footer sesuai branding bisnis Anda.
              </p>
              
              <div className="space-y-4">
                <FeatureItem icon={Printer} text="Support 58mm & 80mm thermal printers" />
                <FeatureItem icon={CheckCircle} text="Customizable header & footer" />
                <FeatureItem icon={CheckCircle} text="Live receipt preview" />
                <FeatureItem icon={CheckCircle} text="Auto-print after checkout" />
                <FeatureItem icon={CheckCircle} text="Browser-based (no drivers needed)" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            Start Running Your Store{' '}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Smarter
            </span>
          </h2>
          
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            AEGIS POS membantu bisnis mengelola penjualan, pelanggan, dan transaksi dalam satu platform modern.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link 
              href="/setup" 
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Start Free Today
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-400" />
              <span>Free forever</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-400" />
              <span>2-minute setup</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

// Feature Showcase Component
function FeatureShowcase({
  badge,
  title,
  description,
  features,
  imageSrc,
  imageAlt,
  reverse
}: {
  badge: string
  title: string
  description: string
  features: string[]
  imageSrc: string
  imageAlt: string
  reverse: boolean
}) {
  return (
    <div className={`grid lg:grid-cols-2 gap-12 items-center mb-24 last:mb-0 ${reverse ? 'lg:flex-row-reverse' : ''}`}>
      <div className={reverse ? 'lg:order-2' : ''}>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-6">
          {badge}
        </div>
        <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
          {title}
        </h3>
        <p className="text-xl text-gray-600 mb-6 leading-relaxed">
          {description}
        </p>
        
        <ul className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={`relative ${reverse ? 'lg:order-1' : ''}`}>
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/80">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
          </div>
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={800}
            height={600}
            className="w-full h-auto"
          />
        </div>
        {/* Decorative blur */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
      </div>
    </div>
  )
}

// Feature Item Component
function FeatureItem({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-blue-600" />
      </div>
      <span className="text-gray-700">{text}</span>
    </div>
  )
}

// Analytics Card Component
function AnalyticsCard({
  imageSrc,
  title,
  description
}: {
  imageSrc: string
  title: string
  description: string
}) {
  return (
    <div className="group">
      <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden mb-6 transition-all group-hover:shadow-xl group-hover:-translate-y-1">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/80">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
        </div>
        <Image
          src={imageSrc}
          alt={title}
          width={400}
          height={300}
          className="w-full h-auto"
        />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
