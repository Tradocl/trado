/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Restablece tu contraseña de Trado</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Trado</Text>
        <Heading style={h1}>Restablece tu contraseña</Heading>
        <Text style={text}>
          Recibimos una solicitud para cambiar la contraseña de tu cuenta en {siteName}. Usa el botón para crear una nueva contraseña segura.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Cambiar contraseña
        </Button>
        <Text style={footer}>
          Si tú no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
const link = { color: '#1f2bd8', textDecoration: 'underline' }
const button = {
  backgroundColor: '#1f2bd8',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#8b90a0', lineHeight: '1.5', margin: '30px 0 0' }
