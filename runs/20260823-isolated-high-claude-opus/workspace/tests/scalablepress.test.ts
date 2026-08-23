import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ScalablePressError,
  createDesign,
  createQuote,
  findOrderIdByToken,
  isAlreadyPlaced,
  placeOrder,
} from '@/lib/scalablepress';

const ADDRESS = {
  name: 'Jenny Rosen',
  address1: '185 Berry St',
  address2: '',
  city: 'San Francisco',
  state: 'CA',
  zip: '94107',
  country: 'US' as const,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

/**
 * A fresh Response per call. `mockResolvedValue` would hand the same Response to
 * every retry, and a Response body can only be read once.
 */
function respondWith(body: unknown, status = 200) {
  return () => Promise.resolve(jsonResponse(body, status));
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.SP_AUTH = 'test-key';
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  // Retries sleep; don't make the suite wait for real backoff.
  vi.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void) => {
    fn();
    return 0 as unknown as NodeJS.Timeout;
  }) as typeof setTimeout);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createDesign', () => {
  it('uploads the artwork as multipart DTG design and returns the design id', async () => {
    fetchMock.mockImplementation(respondWith({ designId: 'design_1' }));

    const designId = await createDesign(Buffer.from('png-bytes'));

    expect(designId).toBe('design_1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/design');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toMatch(/^Basic /);

    const form = init.body as FormData;
    expect(form.get('type')).toBe('dtg');
    expect(form.get('sides[front][dimensions][width]')).toBe('8');
    expect(form.get('sides[front][position][horizontal]')).toBe('C');
    expect(form.get('sides[front][position][offset][top]')).toBe('3');
    expect(form.get('sides[front][artwork]')).toBeInstanceOf(Blob);
  });

  it('retries a 500 and succeeds on a later attempt', async () => {
    fetchMock
      .mockImplementationOnce(respondWith({ statusCode: 500, message: 'Internal Server Error' }, 500))
      .mockImplementationOnce(respondWith({ designId: 'design_2' }));

    await expect(createDesign(Buffer.from('x'))).resolves.toBe('design_2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after three attempts and surfaces a friendly message', async () => {
    fetchMock.mockImplementation(respondWith({ statusCode: 500, message: 'Internal Server Error' }, 500),
    );

    await expect(createDesign(Buffer.from('x'))).rejects.toMatchObject({
      name: 'ScalablePressError',
      status: 500,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry a 400', async () => {
    fetchMock.mockImplementation(respondWith({ statusCode: 400, issues: [{ message: 'Artwork too small' }] }, 400),
    );

    await expect(createDesign(Buffer.from('x'))).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails when SP_AUTH is unset rather than sending an unauthenticated request', async () => {
    delete process.env.SP_AUTH;
    await expect(createDesign(Buffer.from('x'))).rejects.toThrow(/SP_AUTH/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('createQuote', () => {
  const input = {
    designId: 'design_1',
    style: 'fitted' as const,
    size: 'M' as const,
    address: ADDRESS,
    email: 'jenny@example.com',
    reference: 'datetime.store 123',
  };

  it('sends the mapped product, colour and size code', async () => {
    fetchMock.mockImplementation(respondWith({ total: 15.09, orderToken: 'order_abc' }));

    const quote = await createQuote(input);

    expect(quote.orderToken).toBe('order_abc');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.type).toBe('dtg');
    expect(body.designId).toBe('design_1');
    expect(body.products).toEqual([
      { id: 'next-level-fitted-crew', color: 'Black', size: 'med', quantity: 1 },
    ]);
    expect(body.address.email).toBe('jenny@example.com');
    // An empty address2 should be omitted, not sent as "".
    expect('address2' in body.address).toBe(false);
  });

  it('includes address2 when the customer gave one', async () => {
    fetchMock.mockImplementation(respondWith({ orderToken: 'order_abc' }));
    await createQuote({ ...input, address: { ...ADDRESS, address2: 'Suite 550' } });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.address.address2).toBe('Suite 550');
  });

  it('treats a quote without an order token as a failure and forwards the issues', async () => {
    fetchMock.mockImplementation(respondWith({
        total: 15.09,
        orderToken: null,
        orderIssues: [{ code: 'bad_value', message: 'No shipping address given' }],
      }),
    );

    const error = await createQuote(input).catch((e) => e as ScalablePressError);
    expect(error).toBeInstanceOf(ScalablePressError);
    expect((error as ScalablePressError).issues[0].message).toBe('No shipping address given');
    expect((error as ScalablePressError).customerMessage).toContain('No shipping address given');
  });

  it('reports a 500 as a print-partner outage rather than customer error', async () => {
    fetchMock.mockImplementation(respondWith({ statusCode: 500, message: 'Internal Server Error' }, 500),
    );
    const error = await createQuote(input).catch((e) => e as ScalablePressError);
    expect((error as ScalablePressError).customerMessage).toMatch(/print partner/i);
  });

  it('maps 2XL to Scalable Press "xxl" and unisex to the Bella+Canvas tee', async () => {
    fetchMock.mockImplementation(respondWith({ orderToken: 'order_abc' }));
    await createQuote({ ...input, style: 'unisex', size: '2XL' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.products[0]).toMatchObject({ id: 'canvas-unisex-t-shirt', size: 'xxl' });
  });
});

describe('placeOrder', () => {
  it('returns the placed order', async () => {
    fetchMock.mockImplementation(respondWith({ orderId: 'sp_order_1', status: 'order' }));

    const result = await placeOrder('order_abc');

    expect(result).toEqual({ placed: true, order: { orderId: 'sp_order_1', status: 'order' } });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ orderToken: 'order_abc' });
  });

  it('reports a duplicate submission as already-placed instead of throwing', async () => {
    fetchMock.mockImplementation(respondWith(
        { statusCode: 400, message: "Cannot place order. Order is already in state: 'order'." },
        400,
      ),
    );

    await expect(placeOrder('order_abc')).resolves.toEqual({
      placed: false,
      alreadyPlaced: true,
    });
  });

  it('still throws on a genuine rejection', async () => {
    fetchMock.mockImplementation(respondWith({ statusCode: 400, message: 'Insufficient quantity' }, 400),
    );
    await expect(placeOrder('order_abc')).rejects.toThrow(/Insufficient quantity/);
  });
});

describe('isAlreadyPlaced', () => {
  it('recognises the Scalable Press duplicate-order message', () => {
    expect(
      isAlreadyPlaced(
        new ScalablePressError('order', 400, "Cannot place order. Order is already in state: 'order'."),
      ),
    ).toBe(true);
  });

  it('does not match unrelated errors', () => {
    expect(isAlreadyPlaced(new ScalablePressError('order', 400, 'Invalid order token'))).toBe(false);
  });
});

describe('findOrderIdByToken', () => {
  it('finds the order id for a token in the order list', async () => {
    fetchMock.mockImplementation(respondWith([
      { orderId: 'sp_1', orderToken: 'order_other' },
      { orderId: 'sp_2', orderToken: 'order_abc' },
    ]));

    await expect(findOrderIdByToken('order_abc')).resolves.toBe('sp_2');
    expect(fetchMock.mock.calls[0][0]).toContain('/order?limit=25');
  });

  it('returns null when the token has no order', async () => {
    fetchMock.mockImplementation(respondWith([{ orderId: 'sp_1', orderToken: 'order_other' }]));
    await expect(findOrderIdByToken('order_abc')).resolves.toBeNull();
    // A short page means the last page: stop rather than requesting more.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('pages until it finds the token', async () => {
    const page = (n: number) => Array.from({ length: 25 }, (_, i) => ({ orderId: `sp_${n}_${i}`, orderToken: `t_${n}_${i}` }));
    fetchMock
      .mockImplementationOnce(respondWith(page(0)))
      .mockImplementationOnce(respondWith([...page(1).slice(0, 24), { orderId: 'sp_hit', orderToken: 'order_abc' }]));

    await expect(findOrderIdByToken('order_abc')).resolves.toBe('sp_hit');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('skip=25');
  });

  it('gives up after the page budget', async () => {
    const page = (n: number) => Array.from({ length: 25 }, (_, i) => ({ orderId: `sp_${n}_${i}`, orderToken: `t_${n}_${i}` }));
    fetchMock.mockImplementation(respondWith(page(0)));
    await expect(findOrderIdByToken('order_abc', 2)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
