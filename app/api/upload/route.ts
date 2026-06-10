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
      return NextResponse.json({ error: 'Missing file or slug' }, { status: 400 })
    }

    if (!guestName) {
      return NextResponse.json({ error: 'Missing guest name' }, { status: 400 })
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, package_type')
      .eq('slug', slug)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Wedding event not found' }, { status: 404 })
    }

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Only image or video allowed' }, { status: 400 })
    }

    if (event.package_type === 'BASIC' && isVideo) {
      return NextResponse.json(
        { error: 'Video upload is only available for Premium and VIP packages' },
        { status: 403 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadResult: any = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `wedding-qr/${slug}`,
            resource_type: isVideo ? 'video' : 'image',
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        )
        .end(buffer)
    })

    const mediaType = isVideo ? 'video' : 'image'

    const { error: supabaseError } = await supabase.from('photos').insert({
      event_id: event.id,
      slug,
      guest_name: guestName,
      message: message || null,
      media_type: mediaType,
      image_url: isImage ? uploadResult.secure_url : null,
      video_url: isVideo ? uploadResult.secure_url : null,
      audio_url: audioUrl || null,
    })

    if (supabaseError) {
      return NextResponse.json({ error: supabaseError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      mediaType,
      imageUrl: isImage ? uploadResult.secure_url : null,
      videoUrl: isVideo ? uploadResult.secure_url : null,
      audioUrl: audioUrl || null,
    })
  } catch (error) {
    console.error('UPLOAD_ERROR:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Upload failed from server',
      },
      { status: 500 }
    )
  }
}