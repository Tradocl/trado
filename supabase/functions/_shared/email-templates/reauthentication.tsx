/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación de Trado</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Trado</Text>
        <Heading style={h1}>Confirma tu identidad</Heading>
        <Text style={text}>Usa este código para confirmar que eres tú:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Este código expirará pronto. Si tú no lo solicitaste, puedes ignorar este correo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: '#f7f8fb',
  fontFamily: 'Arial, Helvetica, sans-serif',
}
const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e1e3ec',
  borderRadius: '12px',
  margin: '28px auto',
  maxWidth: '560px',
  padding: '28px',
}
const brand = {
  color: '#1f2bd8',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#141821',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: '#6a6f82',
  lineHeight: '1.55',
  margin: '0 0 22px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#141821',
  letterSpacing: '4px',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#8b90a0', lineHeight: '1.5', margin: '30px 0 0' }
