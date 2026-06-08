'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function CreateEventPage() {
  const router = useRouter()

  const [brideName, setBrideName] = useState('')
  const [groomName, setGroomName] = useState('')
  const [eventDate, setEventDate] = useState('')

  const createSlug = (bride: string, groom: string) => {
    return `${bride}-${groom}`
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  }

  const handleGenerateEvent = () => {
    if (!brideName || !groomName || !eventDate) {
      alert('Please fill in all fields')
      return
    }

    const slug = createSlug(brideName, groomName)
    router.push(`/event/${slug}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Create Wedding Event
        </h1>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Bride Name"
            value={brideName}
            onChange={(e) => setBrideName(e.target.value)}
            className="w-full border rounded-lg px-4 py-3"
          />

          <input
            type="text"
            placeholder="Groom Name"
            value={groomName}
            onChange={(e) => setGroomName(e.target.value)}
            className="w-full border rounded-lg px-4 py-3"
          />

          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full border rounded-lg px-4 py-3"
          />

          <button
            onClick={handleGenerateEvent}
            className="w-full bg-pink-500 text-white py-3 rounded-lg hover:bg-pink-600"
          >
            Generate Event
          </button>
        </div>
      </div>
    </main>
  )
}