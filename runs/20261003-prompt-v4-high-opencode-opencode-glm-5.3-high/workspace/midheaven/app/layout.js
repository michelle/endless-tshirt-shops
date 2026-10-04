import './globals.css'

export const metadata = {
  title: 'Midheaven — Custom Night-Sky Tees',
  description:
    'The exact night sky above your moment — every star, constellation, the Moon and the planets — printed on a premium Bella+Canvas 3001 tee. One sky, one shirt, one night.',
  openGraph: {
    title: 'Midheaven — Custom Night-Sky Tees',
    description:
      'The exact night sky above your moment, printed on a premium cotton tee. One sky, one shirt, one night.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="sky-bg" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
