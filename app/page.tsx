

import Link from 'next/link'
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-5xl font-bold mb-4">
        Wedding QR Gallery
      </h1>

      <p className="text-gray-600 text-lg mb-8">
        Scan, Upload & Collect Memories
      </p>

<Link
  href="/create-event"
  className="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600"
>
  Create Event
</Link>
    </main>
  )
}