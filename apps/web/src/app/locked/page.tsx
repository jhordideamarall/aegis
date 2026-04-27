'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LockedPage() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 max-w-lg w-full text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold mb-2">Akun Bisnis Dikunci</h1>
        <p className="text-gray-600 mb-6">
          Akses ke fitur aplikasi dinonaktifkan oleh Super Admin. Silakan hubungi admin untuk
          mengaktifkan kembali akun bisnis ini.
        </p>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
