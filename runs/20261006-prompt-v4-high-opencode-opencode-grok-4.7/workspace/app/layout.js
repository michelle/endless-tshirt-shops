import "./globals.css"

export const metadata = {
  title: "Vesper — the sky from a night you can name",
  description: "A direct-to-garment t-shirt of the real stars above a date and place you choose. Printed after payment, shipped by Prodigi.",
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body>
        <div className="banner">
          Sandbox store. Pay with card <strong>4242 4242 4242 4242</strong>, any future date, any CVC, any postal code.
          You will not be charged. A shirt is sent to print only after payment succeeds, and Prodigi will not actually produce or ship it.
        </div>
        {children}
      </body>
    </html>
  )
}
