/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { styles, brand } from './_styles.ts'

interface Props {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, oldEmail, newEmail, confirmationUrl }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirma el cambio de correo en {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brandBar}>Trado</Text>
        <Heading style={styles.h1}>Confirma el cambio de correo</Heading>
        <Text style={styles.text}>
          Solicitaste cambiar tu correo en {siteName} de{' '}
          <Link href={`mailto:${oldEmail}`} style={{ color: brand.text, textDecoration: 'underline' }}>{oldEmail}</Link>{' '}
          a{' '}
          <Link href={`mailto:${newEmail}`} style={{ color: brand.text, textDecoration: 'underline' }}>{newEmail}</Link>.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>Confirmar cambio</Button>
        <Hr style={styles.divider} />
        <Text style={styles.footer}>
          Si no solicitaste este cambio, asegura tu cuenta de inmediato cambiando tu contraseña.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
