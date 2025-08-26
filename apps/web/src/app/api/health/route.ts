import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Content Creation Web App is healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'v1',
      environment: process.env.NODE_ENV || 'development',
      service: 'web'
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        service: 'web'
      },
      { status: 500 }
    );
  }
}