# Asset provenance

Images were created with the built-in image-generation tool. They are illustrative mockups, not photographs of fulfilled products.

- `public/images/shirt.webp`: optimized website product preview, sourced from `public/images/shirt.png`.
- `public/og.png`: complete landscape social card, visually reviewed for correct text.
- `public/fonts/Chivo.ttf`, `public/fonts/DMMono-Regular.ttf`: Google Fonts upstream files, self-hosted with OFL licenses.

Product image prompt:

> Use case: product-mockup. Create a photorealistic ecommerce product image: a single plain BLACK cotton crew-neck short sleeve unisex t-shirt, lying perfectly flat front facing, symmetrical, no tilt, whole garment visible. Soft natural charcoal black cotton texture, subtle seams and ribbed neckline. No text or logo anywhere. Warm light ivory background #efeee8, soft shadow underneath. Shirt occupies 82 percent width and 80 percent height of square image, centered, neckline at 12 percent height and hem at 90 percent height. Refined independent design store studio photography. No props, no model, no hangers.

Social card prompt:

> Create a polished landscape social sharing card for datetime.store, aspect 1.91:1. Warm ivory background #faf9f5, minimal independent clothing design store aesthetic. Left side large refined dark charcoal text 'Wear this' in clean sans serif, below 'moment.' in muted olive italic serif. Small top left brand 'datetime.store'. Small lower left line 'A black tee. A single timestamp.' Right half photographic black cotton crew neck t-shirt laid flat, entire shirt visible, white small digits '1788610000000' printed once centered high on chest. Lots of editorial negative space, fine subtle border, no other text or logos. Exact spellings. Complete cohesive social card with typography.

Print production uses `lib/artwork.ts`, not generated imagery. The exact captured timestamp is rendered as white font outlines into a transparent PNG.
