/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ oldEmail, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <html lang="es" dir="ltr">
    <head>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Confirma tu nuevo email - Trado</title>
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
                <td style={{ padding: '40px 30px' }}>
                  <h2 style={{ color: '#18181b', fontSize: '24px', fontWeight: 600, margin: '0 0 16px 0' }}>Confirma tu nuevo email</h2>
                  <p style={{ color: '#52525b', fontSize: '16px', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                    Solicitaste cambiar el email de tu cuenta de <strong>{oldEmail}</strong> a <strong>{newEmail}</strong>. Confirma este cambio:
                  </p>
                  <table role="presentation" style={{ width: '100%', borderCollapse: 'collapse', margin: '32px 0' }}>
                    <tr>
                      <td align="center">
                        <a href={confirmationUrl} style={{ display: 'inline-block', background: 'linear-gradient(135deg, #3340d8 0%, #7147d4 100%)', color: '#ffffff', textDecoration: 'none', padding: '16px 40px', borderRadius: '12px', fontSize: '16px', fontWeight: 600 }}>
                          Confirmar Cambio
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style={{ color: '#71717a', fontSize: '14px', lineHeight: 1.6, margin: '24px 0 0 0' }}>
                    Si no solicitaste este cambio, asegura tu cuenta inmediatamente.
                  </p>
                  <div style={{ backgroundColor: '#f4f4f5', borderRadius: '8px', padding: '16px', marginTop: '24px' }}>
                    <p style={{ color: '#71717a', fontSize: '12px', margin: '0 0 8px 0' }}>Si el botón no funciona, copia este enlace:</p>
                    <p style={{ color: '#3340d8', fontSize: '12px', wordBreak: 'break-all', margin: 0 }}>{confirmationUrl}</p>
                  </div>
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

export default EmailChangeEmail
