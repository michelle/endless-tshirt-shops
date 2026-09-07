import {NextResponse} from 'next/server';
export async function GET(){return NextResponse.json({store:'Off Hours Field Club',mode:'sandbox',payments:'simulated',configured:Boolean(process.env.PRODIGI_API_KEY&&process.env.ORDER_SECRET&&process.env.NEXT_PUBLIC_SITE_URL)},{headers:{'Cache-Control':'no-store'}})}
