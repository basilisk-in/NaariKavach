import { Link } from 'react-router-dom'
import { HiShieldCheck } from 'react-icons/hi'

function Home() {
  return (
    <div className="min-h-screen bg-[#121417] text-white flex flex-col items-center justify-center">
      <div className="text-center max-w-2xl px-6">
        {/* Logo and Brand */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="w-12 h-12">
            <HiShieldCheck className="w-full h-full text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">NaariKavach</h1>
        </div>
        
        {/* Tagline */}
        <p className="text-xl text-[#9EABB8] mb-8 leading-relaxed">
          Safety First - Empowering women's security through advanced incident verification technology
        </p>
        
        {/* CTA Button */}
        <Link 
          to="/dashboard"
          className="inline-block bg-[#1773CF] text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-600 transition-colors"
        >
          Access Dashboard
        </Link>
        
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#293038] rounded-lg flex items-center justify-center mx-auto mb-4">
              <HiShieldCheck className="w-8 h-8 text-[#1773CF]" />
            </div>
            <h3 className="text-lg font-bold mb-2">Real-time Monitoring</h3>
            <p className="text-[#9EABB8] text-sm">
              Monitor incidents in real-time with advanced verification systems
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-[#293038] rounded-lg flex items-center justify-center mx-auto mb-4">
              <HiShieldCheck className="w-8 h-8 text-[#1773CF]" />
            </div>
            <h3 className="text-lg font-bold mb-2">Secure Platform</h3>
            <p className="text-[#9EABB8] text-sm">
              Built with security-first principles to protect sensitive data
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-[#293038] rounded-lg flex items-center justify-center mx-auto mb-4">
              <HiShieldCheck className="w-8 h-8 text-[#1773CF]" />
            </div>
            <h3 className="text-lg font-bold mb-2">Quick Response</h3>
            <p className="text-[#9EABB8] text-sm">
              Rapid incident verification and response coordination
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home 