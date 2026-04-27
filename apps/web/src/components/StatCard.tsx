interface StatCardProps {
  title: string
  value: string | number
  icon: string
  trend?: string
}

export default function StatCard({ title, value, icon, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
          {trend && <p className="text-sm text-green-500 mt-2">{trend}</p>}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )
}
