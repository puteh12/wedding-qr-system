'use client'

import { QRCodeCanvas } from 'qrcode.react'

type QrCodeBoxProps = {
  value: string
}

export default function QrCodeBox({ value }: QrCodeBoxProps) {
  return <QRCodeCanvas value={value} size={220} />
}