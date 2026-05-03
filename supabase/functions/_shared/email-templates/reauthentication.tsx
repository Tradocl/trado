/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <html lang="es" dir="ltr">
    <head>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Código de verificación - Trado</title>
    </head>
    <body style={{ margin: 0, padding: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", backgroundColor: '#f4f4f5' }}>
      <table role="presentation" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tr>
          <td align="center" style={{ padding: '40px 20px' }}>
            <table role="presentation" style={{ width: '100%', maxWidth: '600px', borderCollapse: 'collapse', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <tr>
                <td style={{ background: 'linear-gradient(135deg, #3340d8 0%, #7147d4 100%)', padding: '40px 30px', borderRadius: '16px 16px 0 0', textAlign: 'center' }}>
                  <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 700, margin: 0 }}>Trado</h1>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', margin: '8px 0 0 0' }}>Compra y vende con seguridad</p>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '40px 30px', textAlign: 'center' }}>
                  <h2 style={{ color: '#18181b', fontSize: '24px', fontWeight: 600, margin: '0 0 16px 0' }}>Código de verificación</h2>
                  <p style={{ color: '#52525b', fontSize: '16px', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                    Usa este código para confirmar tu identidad en Trado:
                  </p>
                  <div style={{ background: 'linear-gradient(135deg, #3340d8 0%, #7147d4 100%)', borderRadius: '12px', padding: '24px', margin: '24px 0', display: 'inline-block' }}>
                    <p style={{ color: '#ffffff', fontSize: '32px', fontWeight: 700, letterSpacing: '8px', margin: 0, fontFamily: 'Courier, monospace' }}>{token}</p>
                  </div>
                  <p style={{ color: '#71717a', fontSize: '14px', lineHeight: 1.6, margin: '24px 0 0 0' }}>
                    Este código expirará pronto. Si no lo solicitaste, ignora este correo.
                  </p>
                </td>
              </tr>
              <tr>
                <td style={{ backgroundColor: '#fafafa', padding: '24px 30px', borderRadius: '0 0 16px 16px', borderTop: '1px solid #e4e4e7', textAlign: 'center' }}>
                  <p style={{ color: '#a1a1aa', fontSize: '12px', margin: 0 }}>© 2025 Trado. Todos los derechos reservados.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
)

export default ReauthenticationEmail
