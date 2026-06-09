import { v2 as cloudinary } from 'cloudinary'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const file = formData.get('file') as File
    const slug = formData.get('slug') as string
    const guestName = formData.get('guestName') as string
    const message = formData.get('message') as string

    if (!file || !slug) {
      return NextResponse.json({ error: 'Missing file or slug' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: `wedding-qr/${slug}` }, (error, result) => {
          if (error) reject(error)
          else resolve(result)
        })
        .end(buffer)
    })

    const { error } = await supabase.from('photos').insert({
      slug,
      guest_name: guestName,
      message,
      image_url: uploadResult.secure_url,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}