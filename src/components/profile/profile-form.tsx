"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface ProfileFormProps {
  user: {
    id: string
    name?: string | null
    email: string
    image?: string | null
  }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: user.name ?? "",
    email: user.email,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Implement profile update API endpoint
      console.log("Updating profile:", formData)
      
      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      console.error("Failed to update profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center space-x-6">
        <div className="shrink-0">
          <div className="h-24 w-24 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {user.name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase()}
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Profile Picture
          </label>
          <button
            type="button"
            className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
            disabled={isLoading}
          >
            Change avatar
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Display Name
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
          disabled // Email cannot be changed for now
        />
        <p className="mt-1 text-sm text-gray-500">
          Email address cannot be changed
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  )
}