import { NextRequest, NextResponse } from 'next/server';
import { getProdigiOrder } from '@/lib/prodigi';
import { getOrder, saveOrder } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    let prodigiId = id;
    const localOrder = getOrder(id);

    if (localOrder?.prodigiOrderId) {
      prodigiId = localOrder.prodigiOrderId;
    }

    // If it's a Prodigi ID (ord_...) or we resolved one:
    if (prodigiId.startsWith('ord_')) {
      try {
        const liveProdigi = await getProdigiOrder(prodigiId);
        if (localOrder) {
          localOrder.prodigiStatus = liveProdigi.order;
          saveOrder(localOrder);
        }
        return NextResponse.json({
          success: true,
          order: localOrder || { prodigiStatus: liveProdigi.order, id: prodigiId },
          prodigiStatus: liveProdigi.order
        });
      } catch (err: any) {
        console.warn('Prodigi live query failed:', err.message);
      }
    }

    if (localOrder) {
      return NextResponse.json({
        success: true,
        order: localOrder,
        prodigiStatus: localOrder.prodigiStatus
      });
    }

    return NextResponse.json(
      { error: `Order ${id} not found.` },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve order' },
      { status: 500 }
    );
  }
}
