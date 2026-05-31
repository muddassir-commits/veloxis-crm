import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Placeholder Route OK' });
}

export async function POST() {
  return NextResponse.json({ message: 'Placeholder Route OK' });
}
