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

    const file = formData.get('file') as File | null
    const slug = formData.get('slug') as string | null
    const guestName = formData.get('guestName') as string | null
    const message = formData.get('message') as string | null
    const audioUrl = formData.get('audioUrl') as string | null

    if (!file || !slug) {
      return NextResponse.json(
        { error: 'Missing file or slug' },
        { status: 400 }
      )
    }

    if (!guestName) {
      return NextResponse.json(
        { error: 'Missing guest name' },
        { status: 400 }
      )
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { error: 'Missing Cloudinary environment variables' },
        { status: 500 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadResult: any = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `wedding-qr/${slug}`,
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        )
        .end(buffer)
    })

    if (!uploadResult?.secure_url) {
      return NextResponse.json(
        { error: 'Cloudinary upload failed' },
        { status: 500 }
      )
    }

    const { error: supabaseError } = await supabase.from('photos').insert({
      slug,
      guest_name: guestName,
      message: message || null,
      image_url: uploadResult.secure_url,
      audio_url: audioUrl || null,
    })

    if (supabaseError) {
      return NextResponse.json(
        { error: supabaseError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.secure_url,
      audioUrl: audioUrl || null,
    })
  } catch (error) {
    console.error('UPLOAD_ERROR:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Upload failed from server',
      },
      { status: 500 }
    )
  }
}